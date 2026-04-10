import apiClient from './client';
import { toArray, toListResult } from './response-utils';

export interface ResearchGroup {
  id: string;
  campus_id: string;
  name: string;
  description: string | null;
  director_user_id: string;
  created_at: string;
  member_count?: number;
  // Optional fields that some views enrich client-side
  director_name?: string;
  project_count?: number;
  document_count?: number;
  challenge_count?: number;
  [k: string]: unknown;
}

export interface ResearchGroupCreate {
  name: string;
  description?: string;
}

export interface ResearchGroupUpdate {
  name?: string;
  description?: string;
}

export interface ResearchGroupListResponse {
  groups: ResearchGroup[];
  total: number;
}

export interface ResearchGroupDetailResponse {
  group: ResearchGroup;
  members: ResearchMember[];
}

export interface ResearchGroupDashboard {
  group: ResearchGroup;
  members: ResearchMember[];
  projects: ResearchProject[];
  recent_discussions: DiscussionThread[];
  document_collection_count: number;
  challenge_count: number;
}

export interface ResearchMember {
  id?: string;
  user_global_id?: string;
  user_id?: string;
  full_name?: string;
  email?: string;
  role: 'director' | 'researcher' | 'student_member';
  avatar_url?: string | null;
  joined_at?: string;
  [k: string]: unknown;
}

export interface AddMemberPayload {
  user_global_id: string;
  role: 'director' | 'researcher' | 'student_member';
}

export interface ResearchProject {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  status: 'planning' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  // Optional enriched fields
  task_count?: number;
  completed_task_count?: number;
  [k: string]: unknown;
}

export interface ProjectCreate {
  title: string;
  description?: string;
}

export interface ProjectUpdate {
  title?: string;
  description?: string;
  status?: 'planning' | 'in_progress' | 'completed';
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  assigned_to_user_id?: string | null;
  status: 'todo' | 'in_progress' | 'done';
  due_date?: string | null;
  created_at: string;
  updated_at?: string;
  [k: string]: unknown;
}

export interface TaskCreate {
  title: string;
  description?: string;
  assigned_to_user_id?: string | null;
  due_date?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  assigned_to_user_id?: string | null;
  status?: 'todo' | 'in_progress' | 'done';
  due_date?: string | null;
}

export interface ResearchChallenge {
  id: string;
  title: string;
  description?: string;
  type: string;
  difficulty: string;
  is_public?: boolean;
  created_by_name?: string;
  created_at: string;
  [k: string]: unknown;
}

export interface ResearchChallengeCreate {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  is_public?: boolean;
}

export interface DiscussionThread {
  id: string;
  group_id?: string;
  title: string;
  created_by_user_id?: string;
  created_at: string;
  message_count?: number;
  // Optional enriched fields
  last_activity?: string;
  created_by?: { user_id: string; full_name: string };
  [k: string]: unknown;
}

export interface DiscussionMessage {
  id: string;
  discussion_id: string;
  user_global_id: string;
  content: string;
  created_at: string;
  // Optional enriched field
  author?: { user_id: string; full_name: string; avatar_url?: string | null };
  [k: string]: unknown;
}

export interface ThreadCreate {
  title: string;
}

// Kept for backwards compatibility with old UI imports.
export interface ActivityEntry {
  id: string;
  type: string;
  description: string;
  user_name?: string;
  created_at: string;
}

const BASE = '/research-groups';

// Groups
export async function listResearchGroups(): Promise<ResearchGroupListResponse> {
  const res = await apiClient.get(BASE);
  const normalized = toListResult<ResearchGroup>(res.data, {
    arrayKeys: ['groups'],
    totalKeys: ['total'],
  });
  return {
    groups: normalized.items,
    total: normalized.total,
  };
}

export async function listMyResearchGroups(): Promise<ResearchGroup[]> {
  const { groups } = await listResearchGroups();
  return groups;
}

export async function getResearchGroupDetail(groupId: string): Promise<ResearchGroupDetailResponse> {
  const res = await apiClient.get(`${BASE}/${groupId}`);
  const payload = res.data as unknown;

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const container = payload as { group?: ResearchGroup; members?: ResearchMember[] };
    if (container.group) {
      return {
        group: container.group,
        members: toArray<ResearchMember>(container, ['members']),
      };
    }
  }

  return {
    group: payload as ResearchGroup,
    members: [],
  };
}

export async function getResearchGroup(id: string): Promise<ResearchGroup> {
  const detail = await getResearchGroupDetail(id);
  return detail.group;
}

export async function createResearchGroup(payload: ResearchGroupCreate): Promise<ResearchGroup> {
  const res = await apiClient.post(BASE, payload);
  return res.data as ResearchGroup;
}

export async function updateResearchGroup(groupId: string, payload: ResearchGroupUpdate): Promise<ResearchGroup> {
  const res = await apiClient.put(`${BASE}/${groupId}`, payload);
  return res.data as ResearchGroup;
}

export async function deleteResearchGroup(groupId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${groupId}`);
}

export async function getGroupDashboardStrict(groupId: string): Promise<ResearchGroupDashboard> {
  const res = await apiClient.get(`${BASE}/${groupId}/dashboard`);
  return res.data as ResearchGroupDashboard;
}

export async function getGroupDashboard(groupId: string): Promise<ResearchGroupDashboard> {
  try {
    return await getGroupDashboardStrict(groupId);
  } catch {
    const detail = await getResearchGroupDetail(groupId);
    return {
      group: detail.group,
      members: detail.members,
      projects: [],
      recent_discussions: [],
      document_collection_count: 0,
      challenge_count: 0,
    };
  }
}

// Members
export async function listMembers(groupId: string): Promise<ResearchMember[]> {
  const detail = await getResearchGroupDetail(groupId);
  return detail.members;
}

export async function addMember(groupId: string, payload: AddMemberPayload): Promise<ResearchMember> {
  const res = await apiClient.post(`${BASE}/${groupId}/members`, payload);
  return res.data as ResearchMember;
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: string
): Promise<ResearchMember> {
  const res = await apiClient.put(`${BASE}/${groupId}/members/${userId}/role`, { role });
  return res.data as ResearchMember;
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${groupId}/members/${userId}`);
}

export async function searchUsersForGroup(
  query: string
): Promise<{ user_id: string; full_name: string; email: string }[]> {
  const res = await apiClient.get('/admin/users', { params: { search: query, limit: 20 } });
  const items = toArray<Record<string, unknown>>(res.data, ['items', 'users', 'results']);
  return items.map((user) => ({
    user_id: String(user.id ?? user.user_global_id ?? ''),
    full_name: String(user.full_name ?? ''),
    email: String(user.email ?? ''),
  }));
}

// Projects
export async function listProjects(groupId: string): Promise<ResearchProject[]> {
  const res = await apiClient.get(`${BASE}/${groupId}/projects`);
  return toArray<ResearchProject>(res.data, ['projects', 'items', 'results']);
}

export async function createProject(groupId: string, payload: ProjectCreate): Promise<ResearchProject> {
  const res = await apiClient.post(`${BASE}/${groupId}/projects`, payload);
  return res.data as ResearchProject;
}

export async function updateProject(
  _groupId: string,
  projectId: string,
  payload: ProjectUpdate
): Promise<ResearchProject> {
  const res = await apiClient.put(`${BASE}/projects/${projectId}`, payload);
  return res.data as ResearchProject;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`${BASE}/projects/${projectId}`);
}

export async function getProjectTasks(_groupId: string, projectId: string): Promise<ProjectTask[]> {
  const res = await apiClient.get(`${BASE}/projects/${projectId}/tasks`);
  return toArray<ProjectTask>(res.data, ['tasks', 'items', 'results']);
}

export async function createTask(_groupId: string, projectId: string, payload: TaskCreate): Promise<ProjectTask> {
  const res = await apiClient.post(`${BASE}/projects/${projectId}/tasks`, payload);
  return res.data as ProjectTask;
}

export async function updateTask(
  _groupId: string,
  _projectId: string,
  taskId: string,
  payload: TaskUpdate
): Promise<ProjectTask> {
  const res = await apiClient.put(`${BASE}/tasks/${taskId}`, payload);
  return res.data as ProjectTask;
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`${BASE}/tasks/${taskId}`);
}

// Challenges
/**
 * No list endpoint is currently documented for group challenges.
 * Kept for backwards compatibility with existing UI.
 */
export async function listGroupChallenges(groupId: string): Promise<ResearchChallenge[]> {
  try {
    const res = await apiClient.get(`${BASE}/${groupId}/challenges`);
    return toArray<ResearchChallenge>(res.data, ['items', 'challenges', 'results']);
  } catch {
    return [];
  }
}

export async function createGroupChallenge(
  groupId: string,
  payload: ResearchChallengeCreate
): Promise<ResearchChallenge> {
  const res = await apiClient.post(`${BASE}/${groupId}/challenges`, payload);
  return res.data as ResearchChallenge;
}

// Discussions
export async function listDiscussions(groupId: string): Promise<DiscussionThread[]> {
  const res = await apiClient.get(`${BASE}/${groupId}/discussions`);
  return toArray<DiscussionThread>(res.data, ['discussions', 'items', 'threads', 'results']);
}

export async function getDiscussionMessages(_groupId: string, threadId: string): Promise<DiscussionMessage[]> {
  const res = await apiClient.get(`${BASE}/discussions/${threadId}/messages`);
  return toArray<DiscussionMessage>(res.data, ['messages', 'items', 'results']);
}

export async function createDiscussion(groupId: string, payload: ThreadCreate): Promise<DiscussionThread> {
  const res = await apiClient.post(`${BASE}/${groupId}/discussions`, payload);
  return res.data as DiscussionThread;
}

export async function postDiscussionMessage(
  _groupId: string,
  threadId: string,
  content: string
): Promise<DiscussionMessage> {
  const res = await apiClient.post(`${BASE}/discussions/${threadId}/messages`, { content });
  return res.data as DiscussionMessage;
}
