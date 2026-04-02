'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toArray } from '@/lib/api/response-utils';
import {
  addMember,
  createDiscussion,
  createProject,
  createResearchGroup,
  createTask,
  deleteProject,
  deleteResearchGroup,
  deleteTask,
  getDiscussionMessages,
  getGroupDashboardStrict,
  getProjectTasks,
  getResearchGroupDetail,
  listDiscussions,
  listProjects,
  listResearchGroups,
  postDiscussionMessage,
  removeMember,
  updateMemberRole,
  updateProject,
  updateResearchGroup,
  updateTask,
  type DiscussionMessage,
  type DiscussionThread,
  type ProjectTask,
  type ResearchMember,
} from '@/lib/api/research-services';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError, ContextTokenResponse, SedeMembershipInfo, ZoneMembershipInfo } from '@/types/api';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Beaker, FolderKanban, Loader2, Lock, MessageSquare, Plus, RefreshCw, Trash2, Users } from 'lucide-react';

type ProjectStatus = 'planning' | 'in_progress' | 'completed';
type TaskStatus = 'todo' | 'in_progress' | 'done';
type MemberRole = 'director' | 'researcher' | 'student_member';

function getErrorDetail(error: unknown): string {
  if (!error || typeof error !== 'object') return 'An unexpected error occurred.';
  const detail = (error as { detail?: unknown }).detail;
  if (typeof detail === 'string') return detail;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : 'An unexpected error occurred.';
}

function isDirectorOnlyError(error: unknown): boolean {
  return getErrorDetail(error).includes('Only the group director can perform this action.');
}

function isNotMemberDashboardError(error: unknown): boolean {
  return getErrorDetail(error).includes('You must be a member of this research group.');
}

function pickMembershipContext(
  memberships: ZoneMembershipInfo[],
  preferredZoneId?: string | null,
  preferredSedeId?: string | null
): { zone: ZoneMembershipInfo; sede: SedeMembershipInfo } | null {
  if (preferredZoneId && preferredSedeId) {
    const zone = memberships.find((entry) => entry.zone_id === preferredZoneId);
    const sede = zone?.sedes?.find((entry) => entry.sede_id === preferredSedeId);
    if (zone && sede) return { zone, sede };
  }

  if (preferredZoneId) {
    const zone = memberships.find((entry) => entry.zone_id === preferredZoneId);
    const sede = zone?.sedes?.[0];
    if (zone && sede) return { zone, sede };
  }

  for (const zone of memberships) {
    const sede = zone.sedes?.[0];
    if (sede) return { zone, sede };
  }

  return null;
}

function getMemberUserId(member: ResearchMember): string {
  return member.user_global_id ?? member.user_id ?? member.id ?? '';
}

function getMemberKey(member: ResearchMember): string {
  return member.id ?? member.user_global_id ?? member.user_id ?? 'member';
}

function formatDateLabel(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export default function AdminResearchGroupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const accessToken = useAuthStore((s) => s?.accessToken);
  const contextToken = useAuthStore((s) => s?.contextToken);
  const memberships = useAuthStore((s) => s?.memberships ?? []);
  const currentZone = useAuthStore((s) => s?.currentZone);
  const currentSede = useAuthStore((s) => s?.currentSede);
  const currentUserId = useAuthStore((s) => s?.user?.id ?? '');
  const setMemberships = useAuthStore((s) => s?.setMemberships);
  const selectContext = useAuthStore((s) => s?.selectContext);
  const logout = useAuthStore((s) => s?.logout);

  const [contextState, setContextState] = useState<'checking' | 'ready' | 'error'>('checking');
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextAttempt, setContextAttempt] = useState(0);

  const [groupSearch, setGroupSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [blockedGroups, setBlockedGroups] = useState<Record<string, boolean>>({});

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<MemberRole>('researcher');

  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('planning');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const [newDiscussionTitle, setNewDiscussionTitle] = useState('');
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [newMessageContent, setNewMessageContent] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function ensureContext() {
      if (!accessToken) {
        router.replace('/login');
        return;
      }

      if (contextToken) {
        setContextState('ready');
        setContextError(null);
        return;
      }

      setContextState('checking');
      setContextError(null);

      try {
        const response = await apiClient.get('/auth/my-memberships', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        let availableMemberships = toArray<ZoneMembershipInfo>(response.data, ['zones', 'items', 'results']);
        if (availableMemberships.length === 0) {
          availableMemberships = memberships;
        }
        if (!cancelled) setMemberships?.(availableMemberships);

        const selection = pickMembershipContext(
          availableMemberships,
          currentZone?.id,
          currentSede?.id
        );

        if (!selection) {
          if (!cancelled) {
            setContextError('No active memberships were found for this account.');
            setContextState('error');
          }
          router.replace('/select-sede');
          return;
        }

        const ctxResponse = await apiClient.post<ContextTokenResponse>(
          '/auth/select-context',
          {
            zone_id: selection.zone.zone_id,
            sede_id: selection.sede.sede_id,
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (cancelled) return;

        selectContext?.({
          contextToken: ctxResponse.data.context_token,
          zone: {
            id: selection.zone.zone_id,
            code: selection.zone.zone_code,
            name: selection.zone.zone_name,
          },
          sede: {
            id: selection.sede.sede_id,
            name: selection.sede.sede_name,
            slug: selection.sede.sede_slug,
          },
          role: ctxResponse.data.role,
        });

        setContextState('ready');
      } catch (error) {
        if (cancelled) return;
        if ((error as ApiError).status === 401) {
          logout?.();
          router.replace('/login');
          return;
        }
        setContextError(getErrorDetail(error));
        setContextState('error');
      }
    }

    void ensureContext();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accessToken,
    contextToken,
    currentZone?.id,
    currentSede?.id,
    setMemberships,
    selectContext,
    logout,
    router,
    contextAttempt,
  ]);

  const groupsQuery = useQuery({
    queryKey: queryKeys.research.groups,
    queryFn: async () => {
      const response = await listResearchGroups();
      return response.groups;
    },
    enabled: contextState === 'ready',
  });

  const groups = groupsQuery.data ?? [];

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
      return;
    }
    if (selectedGroupId && !groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(groups[0]?.id ?? null);
    }
  }, [groups, selectedGroupId]);

  const filteredGroups = useMemo(() => {
    const value = groupSearch.trim().toLowerCase();
    if (!value) return groups;
    return groups.filter((group) => {
      return group.name.toLowerCase().includes(value) || (group.description ?? '').toLowerCase().includes(value);
    });
  }, [groups, groupSearch]);

  const detailQuery = useQuery({
    queryKey: selectedGroupId ? queryKeys.research.group(selectedGroupId) : ['research', 'groups', '__none'],
    queryFn: () => getResearchGroupDetail(selectedGroupId as string),
    enabled: contextState === 'ready' && !!selectedGroupId,
  });

  const selectedGroup = detailQuery.data?.group ?? null;
  const members = detailQuery.data?.members ?? [];

  useEffect(() => {
    setGroupName(selectedGroup?.name ?? '');
    setGroupDescription(selectedGroup?.description ?? '');
  }, [selectedGroup?.id, selectedGroup?.name, selectedGroup?.description]);

  const isMember = useMemo(() => {
    if (!currentUserId) return false;
    return members.some((member) => getMemberUserId(member) === currentUserId);
  }, [members, currentUserId]);

  const canManageGroup = useMemo(() => {
    if (!currentUserId) return false;
    return members.some((member) => getMemberUserId(member) === currentUserId && member.role === 'director');
  }, [members, currentUserId]);

  const readOnly = !isMember || !canManageGroup || (selectedGroupId ? blockedGroups[selectedGroupId] : false);

  const dashboardQuery = useQuery({
    queryKey: selectedGroupId ? queryKeys.research.dashboard(selectedGroupId) : ['research', 'groups', '__none', 'dashboard'],
    queryFn: () => getGroupDashboardStrict(selectedGroupId as string),
    enabled: contextState === 'ready' && !!selectedGroupId,
    retry: false,
  });

  const dashboardRestricted = dashboardQuery.isError && isNotMemberDashboardError(dashboardQuery.error);

  const projectsQuery = useQuery({
    queryKey: selectedGroupId ? queryKeys.research.projects(selectedGroupId) : ['research', 'groups', '__none', 'projects'],
    queryFn: () => listProjects(selectedGroupId as string),
    enabled: contextState === 'ready' && !!selectedGroupId && isMember,
  });

  const projects = projectsQuery.data ?? [];
  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? null, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
      return;
    }
    if (selectedProjectId && !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0]?.id ?? null);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    setProjectTitle(selectedProject?.title ?? '');
    setProjectDescription(selectedProject?.description ?? '');
    setProjectStatus((selectedProject?.status ?? 'planning') as ProjectStatus);
  }, [selectedProject?.id, selectedProject?.title, selectedProject?.description, selectedProject?.status]);

  const tasksQuery = useQuery({
    queryKey: selectedGroupId && selectedProjectId
      ? queryKeys.research.tasks(selectedGroupId, selectedProjectId)
      : ['research', 'groups', '__none', 'projects', '__none', 'tasks'],
    queryFn: () => getProjectTasks(selectedGroupId as string, selectedProjectId as string),
    enabled: contextState === 'ready' && !!selectedGroupId && !!selectedProjectId && isMember,
  });

  const tasks = tasksQuery.data ?? [];

  const discussionsQuery = useQuery({
    queryKey: selectedGroupId ? queryKeys.research.discussions(selectedGroupId) : ['research', 'groups', '__none', 'discussions'],
    queryFn: () => listDiscussions(selectedGroupId as string),
    enabled: contextState === 'ready' && !!selectedGroupId && isMember,
  });

  const discussions = discussionsQuery.data ?? [];

  useEffect(() => {
    if (!selectedDiscussionId && discussions.length > 0) {
      setSelectedDiscussionId(discussions[0].id);
      return;
    }
    if (selectedDiscussionId && !discussions.some((discussion) => discussion.id === selectedDiscussionId)) {
      setSelectedDiscussionId(discussions[0]?.id ?? null);
    }
  }, [discussions, selectedDiscussionId]);

  const selectedDiscussion = useMemo(() => {
    return discussions.find((discussion) => discussion.id === selectedDiscussionId) ?? null;
  }, [discussions, selectedDiscussionId]);

  const messagesQuery = useQuery({
    queryKey: selectedGroupId && selectedDiscussionId
      ? queryKeys.research.messages(selectedGroupId, selectedDiscussionId)
      : ['research', 'groups', '__none', 'discussions', '__none', 'messages'],
    queryFn: () => getDiscussionMessages(selectedGroupId as string, selectedDiscussionId as string),
    enabled: contextState === 'ready' && !!selectedGroupId && !!selectedDiscussionId && isMember,
  });

  const messages = messagesQuery.data ?? [];

  function invalidateGroupQueries(groupId: string) {
    queryClient.invalidateQueries({ queryKey: queryKeys.research.groups });
    queryClient.invalidateQueries({ queryKey: queryKeys.research.group(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.research.dashboard(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.research.projects(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.research.discussions(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.research.members(groupId) });
  }

  const createGroupMutation = useMutation({
    mutationFn: () => createResearchGroup({ name: newGroupName.trim(), description: newGroupDescription.trim() || undefined }),
    onSuccess: (group) => {
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedGroupId(group.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.research.groups });
      toast({ title: 'Group created', description: `"${group.name}" was created successfully.` });
    },
    onError: (error) => toast({ title: 'Unable to create group', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const updateGroupMutation = useMutation({
    mutationFn: () => updateResearchGroup(selectedGroupId as string, { name: groupName.trim() || undefined, description: groupDescription.trim() || undefined }),
    onSuccess: (group) => {
      if (selectedGroupId) {
        setBlockedGroups((previous) => ({ ...previous, [selectedGroupId]: false }));
        invalidateGroupQueries(selectedGroupId);
      }
      toast({ title: 'Group updated', description: `"${group.name}" was updated.` });
    },
    onError: (error) => {
      if (selectedGroupId && isDirectorOnlyError(error)) {
        setBlockedGroups((previous) => ({ ...previous, [selectedGroupId]: true }));
      }
      toast({ title: 'Unable to update group', description: getErrorDetail(error), variant: 'destructive' });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => deleteResearchGroup(selectedGroupId as string),
    onSuccess: () => {
      const deletedGroupId = selectedGroupId;
      setSelectedGroupId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.research.groups });
      if (deletedGroupId) {
        queryClient.removeQueries({ queryKey: queryKeys.research.group(deletedGroupId) });
      }
      toast({ title: 'Group deleted' });
    },
    onError: (error) => toast({ title: 'Unable to delete group', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const addMemberMutation = useMutation({
    mutationFn: () => addMember(selectedGroupId as string, { user_global_id: newMemberUserId.trim(), role: newMemberRole }),
    onSuccess: () => {
      if (selectedGroupId) invalidateGroupQueries(selectedGroupId);
      setNewMemberUserId('');
      toast({ title: 'Member added' });
    },
    onError: (error) => toast({ title: 'Unable to add member', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const changeMemberRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRole }) => updateMemberRole(selectedGroupId as string, userId, role),
    onSuccess: () => {
      if (selectedGroupId) invalidateGroupQueries(selectedGroupId);
      toast({ title: 'Member role updated' });
    },
    onError: (error) => toast({ title: 'Unable to update role', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeMember(selectedGroupId as string, userId),
    onSuccess: () => {
      if (selectedGroupId) invalidateGroupQueries(selectedGroupId);
      toast({ title: 'Member removed' });
    },
    onError: (error) => toast({ title: 'Unable to remove member', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const createProjectMutation = useMutation({
    mutationFn: () => createProject(selectedGroupId as string, { title: newProjectTitle.trim(), description: newProjectDescription.trim() || undefined }),
    onSuccess: (project) => {
      if (selectedGroupId) invalidateGroupQueries(selectedGroupId);
      setNewProjectTitle('');
      setNewProjectDescription('');
      setSelectedProjectId(project.id);
      toast({ title: 'Project created' });
    },
    onError: (error) => toast({ title: 'Unable to create project', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const updateProjectMutation = useMutation({
    mutationFn: () => updateProject(selectedGroupId as string, selectedProjectId as string, {
      title: projectTitle.trim() || undefined,
      description: projectDescription.trim() || undefined,
      status: projectStatus,
    }),
    onSuccess: () => {
      if (selectedGroupId) invalidateGroupQueries(selectedGroupId);
      toast({ title: 'Project updated' });
    },
    onError: (error) => toast({ title: 'Unable to update project', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => deleteProject(selectedProjectId as string),
    onSuccess: () => {
      if (selectedGroupId) invalidateGroupQueries(selectedGroupId);
      setSelectedProjectId(null);
      toast({ title: 'Project deleted' });
    },
    onError: (error) => toast({ title: 'Unable to delete project', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const createTaskMutation = useMutation({
    mutationFn: () => createTask(selectedGroupId as string, selectedProjectId as string, {
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      assigned_to_user_id: newTaskAssignee.trim() || null,
      due_date: newTaskDueDate || undefined,
    }),
    onSuccess: () => {
      if (selectedGroupId && selectedProjectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.research.tasks(selectedGroupId, selectedProjectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.research.projects(selectedGroupId) });
      }
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
      toast({ title: 'Task created' });
    },
    onError: (error) => toast({ title: 'Unable to create task', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ task, status }: { task: ProjectTask; status: TaskStatus }) => updateTask(selectedGroupId as string, selectedProjectId as string, task.id, {
      title: task.title,
      description: task.description ?? undefined,
      assigned_to_user_id: task.assigned_to_user_id ?? null,
      status,
      due_date: task.due_date ?? null,
    }),
    onSuccess: () => {
      if (selectedGroupId && selectedProjectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.research.tasks(selectedGroupId, selectedProjectId) });
      }
    },
    onError: (error) => toast({ title: 'Unable to update task', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      if (selectedGroupId && selectedProjectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.research.tasks(selectedGroupId, selectedProjectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.research.projects(selectedGroupId) });
      }
      toast({ title: 'Task deleted' });
    },
    onError: (error) => toast({ title: 'Unable to delete task', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const createDiscussionMutation = useMutation({
    mutationFn: () => createDiscussion(selectedGroupId as string, { title: newDiscussionTitle.trim() }),
    onSuccess: (discussion) => {
      if (selectedGroupId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.research.discussions(selectedGroupId) });
      }
      setNewDiscussionTitle('');
      setSelectedDiscussionId(discussion.id);
      toast({ title: 'Discussion created' });
    },
    onError: (error) => toast({ title: 'Unable to create discussion', description: getErrorDetail(error), variant: 'destructive' }),
  });

  const postMessageMutation = useMutation({
    mutationFn: () => postDiscussionMessage(selectedGroupId as string, selectedDiscussionId as string, newMessageContent.trim()),
    onSuccess: () => {
      if (selectedGroupId && selectedDiscussionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.research.messages(selectedGroupId, selectedDiscussionId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.research.discussions(selectedGroupId) });
      }
      setNewMessageContent('');
    },
    onError: (error) => toast({ title: 'Unable to send message', description: getErrorDetail(error), variant: 'destructive' }),
  });

  if (contextState === 'checking') {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Research Groups" description="Admin workspace powered by /api/v1/research-groups" />
        <Card>
          <CardContent className="py-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing tenant context...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (contextState === 'error') {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Research Groups" description="Admin workspace powered by /api/v1/research-groups" />
        <Alert variant="destructive">
          <AlertTitle>Unable to initialize context</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            <span>{contextError}</span>
            <Button size="sm" variant="outline" onClick={() => setContextAttempt((value) => value + 1)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Research Groups" description="Admin workspace powered by /api/v1/research-groups" />

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Create Group</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input
            placeholder="Group name"
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={newGroupDescription}
            onChange={(event) => setNewGroupDescription(event.target.value)}
          />
          <Button onClick={() => createGroupMutation.mutate()} disabled={!newGroupName.trim() || createGroupMutation.isPending}>
            {createGroupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Groups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search groups..."
              value={groupSearch}
              onChange={(event) => setGroupSearch(event.target.value)}
            />
            {groupsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedGroupId === group.id
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/50 hover:bg-muted/20'
                    }`}
                  >
                    <p className="text-sm font-semibold truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{group.description || 'No description'}</p>
                    <p className="text-[11px] text-muted-foreground mt-2">{group.member_count ?? 0} members</p>
                  </button>
                ))}
                {filteredGroups.length === 0 && (
                  <p className="text-sm text-muted-foreground">No groups found.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!selectedGroupId || !selectedGroup ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                Select a group to view details.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border/50">
                <CardContent className="pt-6 space-y-1">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Beaker className="h-5 w-5 text-primary" />
                    {selectedGroup.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">Created: {formatDateLabel(selectedGroup.created_at)}</p>
                  <p className="text-xs text-muted-foreground">Group ID: {selectedGroup.id}</p>
                </CardContent>
              </Card>

              {(readOnly || dashboardRestricted) && (
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertTitle>Read-only mode</AlertTitle>
                  <AlertDescription>
                    {dashboardRestricted
                      ? 'You are not a member of this research group.'
                      : 'Only the director can perform write actions in this group.'}
                  </AlertDescription>
                </Alert>
              )}

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Group Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">Name</Label>
                      <Input
                        id="group-name"
                        value={groupName}
                        onChange={(event) => setGroupName(event.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group-description">Description</Label>
                      <Input
                        id="group-description"
                        value={groupDescription}
                        onChange={(event) => setGroupDescription(event.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => updateGroupMutation.mutate()} disabled={readOnly || updateGroupMutation.isPending}>
                      {updateGroupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save
                    </Button>
                    <Button variant="destructive" onClick={() => deleteGroupMutation.mutate()} disabled={readOnly || deleteGroupMutation.isPending}>
                      {deleteGroupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Members ({members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_200px_auto]">
                    <Input
                      placeholder="User global id (UUID)"
                      value={newMemberUserId}
                      onChange={(event) => setNewMemberUserId(event.target.value)}
                      disabled={readOnly}
                    />
                    <Select value={newMemberRole} onValueChange={(value) => setNewMemberRole(value as MemberRole)} disabled={readOnly}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="director">director</SelectItem>
                        <SelectItem value="researcher">researcher</SelectItem>
                        <SelectItem value="student_member">student_member</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => addMemberMutation.mutate()} disabled={readOnly || !newMemberUserId.trim() || addMemberMutation.isPending}>
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {members.map((member) => {
                      const userId = getMemberUserId(member);
                      return (
                        <div key={getMemberKey(member)} className="border border-border/50 rounded-lg p-2.5 flex flex-wrap items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{(member.full_name ?? userId) || 'Unknown user'}</p>
                            <p className="text-xs text-muted-foreground truncate">{(member.email ?? userId) || '-'}</p>
                          </div>
                          <Select value={member.role} onValueChange={(value) => userId && changeMemberRoleMutation.mutate({ userId, role: value as MemberRole })} disabled={readOnly || !userId}>
                            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="director">director</SelectItem>
                              <SelectItem value="researcher">researcher</SelectItem>
                              <SelectItem value="student_member">student_member</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="destructive" size="sm" onClick={() => userId && removeMemberMutation.mutate(userId)} disabled={readOnly || !userId}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    Projects & Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <Input
                      placeholder="New project title"
                      value={newProjectTitle}
                      onChange={(event) => setNewProjectTitle(event.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      placeholder="New project description"
                      value={newProjectDescription}
                      onChange={(event) => setNewProjectDescription(event.target.value)}
                      disabled={readOnly}
                    />
                    <Button onClick={() => createProjectMutation.mutate()} disabled={readOnly || !newProjectTitle.trim() || createProjectMutation.isPending}>
                      Create
                    </Button>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
                    <div className="space-y-2">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => setSelectedProjectId(project.id)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                            selectedProjectId === project.id
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border/50 hover:bg-muted/20'
                          }`}
                        >
                          <p className="text-sm font-medium truncate">{project.title}</p>
                          <p className="text-xs text-muted-foreground">{project.status}</p>
                        </button>
                      ))}
                      {projects.length === 0 && (
                        <p className="text-sm text-muted-foreground">No projects yet.</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      {!selectedProject ? (
                        <p className="text-sm text-muted-foreground">Select a project to manage details and tasks.</p>
                      ) : (
                        <>
                          <div className="grid gap-2 md:grid-cols-[1fr_220px]">
                            <Input
                              value={projectTitle}
                              onChange={(event) => setProjectTitle(event.target.value)}
                              disabled={readOnly}
                            />
                            <Select value={projectStatus} onValueChange={(value) => setProjectStatus(value as ProjectStatus)} disabled={readOnly}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="planning">planning</SelectItem>
                                <SelectItem value="in_progress">in_progress</SelectItem>
                                <SelectItem value="completed">completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            rows={2}
                            value={projectDescription}
                            onChange={(event) => setProjectDescription(event.target.value)}
                            disabled={readOnly}
                          />
                          <div className="flex gap-2">
                            <Button onClick={() => updateProjectMutation.mutate()} disabled={readOnly || updateProjectMutation.isPending}>
                              Save project
                            </Button>
                            <Button variant="destructive" onClick={() => deleteProjectMutation.mutate()} disabled={readOnly || deleteProjectMutation.isPending}>
                              Delete project
                            </Button>
                          </div>

                          <div className="border-t border-border/50 pt-3 space-y-2">
                            <p className="text-sm font-semibold">Tasks</p>
                            <div className="grid gap-2 md:grid-cols-[1fr_1fr_200px_140px_auto]">
                              <Input
                                placeholder="Task title"
                                value={newTaskTitle}
                                onChange={(event) => setNewTaskTitle(event.target.value)}
                                disabled={readOnly}
                              />
                              <Input
                                placeholder="Task description"
                                value={newTaskDescription}
                                onChange={(event) => setNewTaskDescription(event.target.value)}
                                disabled={readOnly}
                              />
                              <Input
                                placeholder="Assignee user id"
                                value={newTaskAssignee}
                                onChange={(event) => setNewTaskAssignee(event.target.value)}
                                disabled={readOnly}
                              />
                              <Input
                                type="date"
                                value={newTaskDueDate}
                                onChange={(event) => setNewTaskDueDate(event.target.value)}
                                disabled={readOnly}
                              />
                              <Button onClick={() => createTaskMutation.mutate()} disabled={readOnly || !newTaskTitle.trim() || createTaskMutation.isPending}>
                                Add
                              </Button>
                            </div>

                            <div className="space-y-2">
                              {tasks.map((task) => (
                                <div key={task.id} className="border border-border/50 rounded-lg p-2.5 flex flex-wrap gap-2 items-center">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{task.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      assignee: {task.assigned_to_user_id ?? '-'} | due: {task.due_date ?? '-'}
                                    </p>
                                  </div>
                                  <Select value={task.status} onValueChange={(value) => updateTaskMutation.mutate({ task, status: value as TaskStatus })} disabled={readOnly}>
                                    <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="todo">todo</SelectItem>
                                      <SelectItem value="in_progress">in_progress</SelectItem>
                                      <SelectItem value="done">done</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button variant="destructive" size="sm" onClick={() => deleteTaskMutation.mutate(task.id)} disabled={readOnly}>
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              ))}
                              {tasks.length === 0 && (
                                <p className="text-sm text-muted-foreground">No tasks yet.</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Discussions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <Input
                      placeholder="New discussion title"
                      value={newDiscussionTitle}
                      onChange={(event) => setNewDiscussionTitle(event.target.value)}
                      disabled={readOnly}
                    />
                    <Button onClick={() => createDiscussionMutation.mutate()} disabled={readOnly || !newDiscussionTitle.trim() || createDiscussionMutation.isPending}>
                      Create
                    </Button>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
                    <div className="space-y-2">
                      {discussions.map((discussion: DiscussionThread) => (
                        <button
                          key={discussion.id}
                          type="button"
                          onClick={() => setSelectedDiscussionId(discussion.id)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                            selectedDiscussionId === discussion.id
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border/50 hover:bg-muted/20'
                          }`}
                        >
                          <p className="text-sm font-medium truncate">{discussion.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDateLabel(discussion.created_at)}</p>
                        </button>
                      ))}
                      {discussions.length === 0 && (
                        <p className="text-sm text-muted-foreground">No discussions yet.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      {!selectedDiscussion ? (
                        <p className="text-sm text-muted-foreground">Select a discussion to view messages.</p>
                      ) : (
                        <>
                          <p className="text-sm font-semibold">{selectedDiscussion.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Real message count: <Badge variant="outline">{messages.length}</Badge>
                          </p>
                          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                            {messages.map((message: DiscussionMessage) => (
                              <div key={message.id} className="border border-border/50 rounded-lg p-2.5">
                                <p className="text-sm">{message.content}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                  {message.user_global_id} | {formatDateLabel(message.created_at)}
                                </p>
                              </div>
                            ))}
                            {messages.length === 0 && (
                              <p className="text-sm text-muted-foreground">No messages yet.</p>
                            )}
                          </div>
                          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                            <Textarea
                              rows={2}
                              value={newMessageContent}
                              onChange={(event) => setNewMessageContent(event.target.value)}
                              placeholder="Write a message..."
                              disabled={readOnly}
                            />
                            <Button onClick={() => postMessageMutation.mutate()} disabled={readOnly || !newMessageContent.trim() || postMessageMutation.isPending}>
                              Send
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
