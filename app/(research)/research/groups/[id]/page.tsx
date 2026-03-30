'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGroupDashboard,
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
  searchUsersForGroup,
  listProjects,
  createProject,
  listGroupChallenges,
  createGroupChallenge,
} from '@/lib/api/research-services';
import type {
  ResearchMember,
  ResearchProject,
  AddMemberPayload,
  ProjectCreate,
  ResearchChallengeCreate,
  DiscussionThread as DiscThread,
} from '@/lib/api/research-services';
import { listCollections, listDocuments, uploadDocument, createCollection } from '@/lib/api/document-services';
import type { DocumentCollection, DocumentItem } from '@/types/api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Users,
  FolderKanban,
  FileText,
  Code2,
  MessageSquare,
  BarChart3,
  Calendar,
  Loader2,
  Plus,
  Search,
  UserPlus,
  Trash2,
  ShieldCheck,
  Upload,
  Beaker,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { KanbanBoard } from '@/components/research/kanban-board';
import { ProjectDetailModal } from '@/components/research/project-detail-modal';
import { DiscussionForum } from '@/components/research/discussion-forum';

// ─── Activity Icon ───────────────────────────────────────────────
const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  member_joined: <UserPlus className="w-3.5 h-3.5 text-primary" />,
  project_created: <FolderKanban className="w-3.5 h-3.5 text-accent" />,
  document_uploaded: <FileText className="w-3.5 h-3.5 text-secondary" />,
  challenge_created: <Code2 className="w-3.5 h-3.5 text-unad-gold" />,
  discussion_posted: <MessageSquare className="w-3.5 h-3.5 text-primary" />,
  task_completed: <FolderKanban className="w-3.5 h-3.5 text-secondary" />,
};

const ROLE_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  director: { label: 'Director', variant: 'default' },
  researcher: { label: 'Investigador', variant: 'secondary' },
  student_member: { label: 'Estudiante', variant: 'outline' },
};

// ─── Main Page ──────────────────────────────────────────────────

export default function ResearchGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const groupId = params.id as string;
  const currentRole = useAuthStore((s) => s?.currentRole);
  const userId = useAuthStore((s) => s?.user?.id);

  const [activeTab, setActiveTab] = useState('panel');

  // ─── Dashboard ───
  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: queryKeys.research.dashboard(groupId),
    queryFn: () => getGroupDashboard(groupId),
  });
  const group = dashboard?.group;
  const dashStats = dashboard ? {
    members: dashboard.members?.length ?? group?.member_count ?? 0,
    projects: dashboard.projects?.length ?? group?.project_count ?? 0,
    documents: dashboard.document_collection_count ?? group?.document_count ?? 0,
    challenges: dashboard.challenge_count ?? group?.challenge_count ?? 0,
  } : null;
  const isDirector = currentRole === 'director_semillero' || currentRole === 'admin';

  // ─── Members ───
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: queryKeys.research.members(groupId),
    queryFn: () => listMembers(groupId),
    enabled: activeTab === 'members' || activeTab === 'projects',
  });

  // ─── Projects ───
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: queryKeys.research.projects(groupId),
    queryFn: () => listProjects(groupId),
    enabled: activeTab === 'projects',
  });

  // ─── Challenges ───
  const { data: challenges = [], isLoading: loadingChallenges } = useQuery({
    queryKey: queryKeys.research.challenges(groupId),
    queryFn: () => listGroupChallenges(groupId),
    enabled: activeTab === 'challenges',
  });

  // ─── State for dialogs ───
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingRole, setAddingRole] = useState<'researcher' | 'student_member'>('student_member');
  const [removeTarget, setRemoveTarget] = useState<ResearchMember | null>(null);
  const [changeRoleTarget, setChangeRoleTarget] = useState<ResearchMember | null>(null);
  const [newRoleValue, setNewRoleValue] = useState('');

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [selectedProject, setSelectedProject] = useState<ResearchProject | null>(null);

  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [challTitle, setChallTitle] = useState('');
  const [challDesc, setChallDesc] = useState('');
  const [challType, setChallType] = useState('coding');
  const [challDifficulty, setChallDifficulty] = useState('medium');

  // ─── Mutations ───
  const addMemberMut = useMutation({
    mutationFn: (payload: AddMemberPayload) => addMember(groupId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.research.members(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.research.dashboard(groupId) });
      setShowAddMember(false);
      setMemberSearch('');
      setSearchResults([]);
      toast({ title: 'Miembro agregado' });
    },
    onError: () => toast({ title: 'Error', description: 'No se pudo agregar el miembro.', variant: 'destructive' }),
  });

  const removeMemberMut = useMutation({
    mutationFn: (memberId: string) => removeMember(groupId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.research.members(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.research.dashboard(groupId) });
      setRemoveTarget(null);
      toast({ title: 'Miembro removido' });
    },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const changeRoleMut = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) => updateMemberRole(groupId, memberId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.research.members(groupId) });
      setChangeRoleTarget(null);
      toast({ title: 'Rol actualizado' });
    },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const createProjectMut = useMutation({
    mutationFn: (p: ProjectCreate) => createProject(groupId, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.research.projects(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.research.dashboard(groupId) });
      setShowCreateProject(false);
      setProjTitle('');
      setProjDesc('');
      toast({ title: 'Proyecto creado' });
    },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const createChallengeMut = useMutation({
    mutationFn: (p: ResearchChallengeCreate) => createGroupChallenge(groupId, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.research.challenges(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.research.dashboard(groupId) });
      setShowCreateChallenge(false);
      setChallTitle('');
      setChallDesc('');
      toast({ title: 'Reto creado' });
    },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  // ─── Member search ───
  const handleMemberSearch = useCallback(async () => {
    const q = memberSearch.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await searchUsersForGroup(q);
      setSearchResults(res);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [memberSearch]);

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map((w) => w?.[0] ?? '').join('').toUpperCase();

  // ─── Render ───
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/research/groups')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          {loadingDash ? (
            <Skeleton className="h-7 w-64" />
          ) : (
            <>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Beaker className="w-5 h-5 text-primary" />
                {group?.name ?? 'Grupo'}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Director: {group?.director_name} · Creado {group?.created_at
                  ? formatDistanceToNow(new Date(group.created_at), { addSuffix: true, locale: es })
                  : ''}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="panel" className="text-xs"><BarChart3 className="w-3.5 h-3.5 mr-1" />Panel</TabsTrigger>
          <TabsTrigger value="members" className="text-xs"><Users className="w-3.5 h-3.5 mr-1" />Miembros</TabsTrigger>
          <TabsTrigger value="projects" className="text-xs"><FolderKanban className="w-3.5 h-3.5 mr-1" />Proyectos</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1" />Documentos</TabsTrigger>
          <TabsTrigger value="challenges" className="text-xs"><Code2 className="w-3.5 h-3.5 mr-1" />Retos</TabsTrigger>
          <TabsTrigger value="discussions" className="text-xs"><MessageSquare className="w-3.5 h-3.5 mr-1" />Discusiones</TabsTrigger>
        </TabsList>

        {/* ======================= PANEL GENERAL ======================= */}
        <TabsContent value="panel" className="space-y-4 mt-4">
          {loadingDash ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Miembros', value: dashStats?.members ?? 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Proyectos', value: dashStats?.projects ?? 0, icon: FolderKanban, color: 'text-accent', bg: 'bg-accent/10' },
                  { label: 'Documentos', value: dashStats?.documents ?? 0, icon: FileText, color: 'text-secondary', bg: 'bg-secondary/10' },
                  { label: 'Retos', value: dashStats?.challenges ?? 0, icon: Code2, color: 'text-unad-gold', bg: 'bg-unad-gold/10' },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <Card key={s.label} className="border-border/50">
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                            <p className="text-2xl font-bold mt-1">{s.value}</p>
                          </div>
                          <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${s.color}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {group?.description && (
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Recent Discussions */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Discusiones Recientes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(!dashboard?.recent_discussions || dashboard.recent_discussions.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin discusiones aún.</p>
                  ) : (
                    dashboard.recent_discussions.slice(0, 10).map((t: DiscThread) => (
                      <div key={t.id} className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {t.message_count ?? 0} mensaje(s) · {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ======================= MIEMBROS ======================= */}
        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{members.length} miembro{members.length !== 1 ? 's' : ''}</p>
            {isDirector && (
              <Button size="sm" onClick={() => setShowAddMember(true)}>
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Agregar Miembro
              </Button>
            )}
          </div>

          {loadingMembers ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE.student_member;
                return (
                  <div key={m.id ?? m.user_global_id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials(m.full_name ?? '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{m.full_name ?? m.user_global_id}</p>
                        <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {m.email ?? ''}{m.joined_at ? ` · ${formatDistanceToNow(new Date(m.joined_at), { addSuffix: true, locale: es })}` : ''}
                      </p>
                    </div>
                    {isDirector && m.role !== 'director' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setChangeRoleTarget(m); setNewRoleValue(m.role); }}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRemoveTarget(m)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ======================= PROYECTOS ======================= */}
        <TabsContent value="projects" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{projects.length} proyecto{projects.length !== 1 ? 's' : ''}</p>
            {isDirector && (
              <Button size="sm" onClick={() => setShowCreateProject(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Crear Proyecto
              </Button>
            )}
          </div>

          {loadingProjects ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <FolderKanban className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">Sin proyectos aún</p>
                <p className="text-xs text-muted-foreground mt-1">Crea un proyecto para organizar las actividades del grupo.</p>
              </CardContent>
            </Card>
          ) : (
            <KanbanBoard
              groupId={groupId}
              projects={projects}
              onProjectClick={(p) => setSelectedProject(p)}
            />
          )}
        </TabsContent>

        {/* ======================= DOCUMENTOS ======================= */}
        <TabsContent value="documents" className="space-y-4 mt-4">
          <GroupDocumentsTab groupId={groupId} />
        </TabsContent>

        {/* ======================= RETOS ======================= */}
        <TabsContent value="challenges" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{challenges.length} reto{challenges.length !== 1 ? 's' : ''} privado{challenges.length !== 1 ? 's' : ''}</p>
            {isDirector && (
              <Button size="sm" onClick={() => setShowCreateChallenge(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Crear Reto Privado
              </Button>
            )}
          </div>

          {loadingChallenges ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : challenges.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Code2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">Sin retos privados</p>
                <p className="text-xs text-muted-foreground mt-1">Crea retos exclusivos para los miembros del grupo.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {challenges.map((c) => (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.title}</p>
                      {c.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{c.difficulty}</Badge>
                        <Badge variant="outline" className="text-[10px] text-accent border-accent/30">🔒 Privado</Badge>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ======================= DISCUSIONES ======================= */}
        <TabsContent value="discussions" className="mt-4">
          <DiscussionForum groupId={groupId} />
        </TabsContent>
      </Tabs>

      {/* ======================= DIALOGS ======================= */}

      {/* Add Member */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Miembro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nombre o email..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMemberSearch()}
              />
              <Button onClick={handleMemberSearch} disabled={searching || !memberSearch.trim()}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={addingRole} onValueChange={(v) => setAddingRole(v as 'researcher' | 'student_member')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="researcher">Investigador</SelectItem>
                  <SelectItem value="student_member">Estudiante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {searchResults.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{u.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">{u.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addMemberMut.mutate({ user_global_id: u.user_id, role: addingRole })}
                      disabled={addMemberMut.isPending}
                    >
                      {addMemberMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirm */}
      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover miembro</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Remover a <strong>{removeTarget?.full_name}</strong> del grupo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeTarget && removeMemberMut.mutate(removeTarget.id ?? removeTarget.user_global_id ?? '')}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role */}
      <Dialog open={!!changeRoleTarget} onOpenChange={(v) => !v && setChangeRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Rol — {changeRoleTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Select value={newRoleValue} onValueChange={setNewRoleValue}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="researcher">Investigador</SelectItem>
                <SelectItem value="student_member">Estudiante</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleTarget(null)}>Cancelar</Button>
            <Button
              onClick={() => changeRoleTarget && changeRoleMut.mutate({ memberId: changeRoleTarget.id ?? changeRoleTarget.user_global_id ?? '', role: newRoleValue })}
              disabled={changeRoleMut.isPending}
            >
              {changeRoleMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input placeholder="Título del proyecto" value={projTitle} onChange={(e) => setProjTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea placeholder="Describe el proyecto..." value={projDesc} onChange={(e) => setProjDesc(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateProject(false)}>Cancelar</Button>
            <Button
              onClick={() => createProjectMut.mutate({ title: projTitle.trim(), description: projDesc.trim() })}
              disabled={!projTitle.trim() || createProjectMut.isPending}
            >
              {createProjectMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Challenge */}
      <Dialog open={showCreateChallenge} onOpenChange={setShowCreateChallenge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Reto Privado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input placeholder="Título del reto" value={challTitle} onChange={(e) => setChallTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea placeholder="Describe el reto..." value={challDesc} onChange={(e) => setChallDesc(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={challType} onValueChange={setChallType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coding">Coding</SelectItem>
                    <SelectItem value="case_study">Estudio de Caso</SelectItem>
                    <SelectItem value="essay">Ensayo</SelectItem>
                    <SelectItem value="data_analysis">Análisis de Datos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dificultad</Label>
                <Select value={challDifficulty} onValueChange={setChallDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                    <SelectItem value="expert">Experto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateChallenge(false)}>Cancelar</Button>
            <Button
              onClick={() =>
                createChallengeMut.mutate({
                  title: challTitle.trim(),
                  description: challDesc.trim(),
                  type: challType,
                  difficulty: challDifficulty,
                  is_public: false,
                })
              }
              disabled={!challTitle.trim() || createChallengeMut.isPending}
            >
              {createChallengeMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Crear Reto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          open={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          groupId={groupId}
          project={selectedProject}
          members={members}
        />
      )}
    </div>
  );
}

// ─── Documents Tab (Scoped to group) ────────────────────────────────

function GroupDocumentsTab({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Fetch group collections scoped to research_group
  const { data: collections, isLoading } = useQuery({
    queryKey: ['research', groupId, 'doc-collections'],
    queryFn: async () => {
      const all = await listCollections();
      // Filter to research_group type - the backend may handle scoping
      return Array.isArray(all) ? all.filter((c) => c.owner_type === 'research_group') : all;
    },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');

  const createMut = useMutation({
    mutationFn: () =>
      createCollection({ name: colName.trim(), description: colDesc.trim(), owner_type: 'research_group', owner_id: groupId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['research', groupId, 'doc-collections'] });
      setShowCreate(false);
      setColName('');
      setColDesc('');
      toast({ title: 'Colección creada' });
    },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const handleDrop = async (e: React.DragEvent, collectionId: string) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadDocument(collectionId, file);
      }
      qc.invalidateQueries({ queryKey: ['research', groupId, 'doc-collections'] });
      toast({ title: `${files.length} archivo(s) subido(s)` });
    } catch {
      toast({ title: 'Error al subir archivos', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Documentos del grupo — solo visibles para los miembros
        </p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Nueva Colección
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : !collections || collections.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Sin colecciones de documentos</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crea una colección para subir documentos del grupo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {collections.map((col) => (
            <Card
              key={col.id}
              className="border-border/50 hover:border-primary/20 transition-all"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-secondary" />
                      {col.name}
                    </p>
                    {col.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{col.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {col.document_count ?? 0} documento(s) · Arrastra archivos aquí para subir
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Grupo</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Subiendo archivos...
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Colección de Documentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Artículos de referencia" value={colName} onChange={(e) => setColName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea placeholder="Describe esta colección..." value={colDesc} onChange={(e) => setColDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate()} disabled={!colName.trim() || createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
