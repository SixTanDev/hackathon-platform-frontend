import apiClient from './client';
import { toArray } from './response-utils';

// ─── Types matching real API schemas ─────────────────────────────────────────

/** ResearchGroupResponse from API */
export interface ResearchGroup {
  id: string;
  campus_id: string;
  name: string;
  description: string | null;
  director_user_id: string;
  created_at: string;
  member_count?: number;
  // Enriched fields from dashboard endpoint
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

/** DashboardResponse from API: GET /research-groups/{id}/dashboard */
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
  user_id?: string; // alias
  full_name?: string;
  email?: string;
  role: 'director' | 'researcher' | 'student_member';
  avatar_url?: string | null;
  joined_at?: string;
  [k: string]: unknown;
}

export interface AddMemberPayload {
  user_global_id: string;
  role: 'researcher' | 'student_member';
}

/** ProjectResponse from API */
export interface ResearchProject {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  status: 'planning' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  // Not in API but may be enriched
  task_count?: number;
  completed_task_count?: number;
  [k: string]: unknown;
}

/** TaskResponse from API */
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

export interface ProjectCreate {
  title: string;
  description?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  assigned_to_user_id?: string;
  due_date?: string;
}

/** Challenges created within a research group — reuse Challenge type loosely */
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

/** DiscussionResponse from API */
export interface DiscussionThread {
  id: string;
  group_id?: string;
  title: string;
  created_by_user_id?: string;
  created_at: string;
  message_count?: number;
  // Enriched
  last_activity?: string;
  created_by?: { user_id: string; full_name: string };
  [k: string]: unknown;
}

/** DiscussionMessageResponse from API */
export interface DiscussionMessage {
  id: string;
  discussion_id: string;
  user_global_id: string;
  content: string;
  created_at: string;
  // Enriched
  author?: { user_id: string; full_name: string; avatar_url?: string | null };
  [k: string]: unknown;
}

export interface ThreadCreate {
  title: string;
}

// Keep for backward compat with UI
export interface ActivityEntry {
  id: string;
  type: string;
  description: string;
  user_name?: string;
  created_at: string;
}

// ─── Research Groups CRUD ───────────────────────────────────────────────────

const BASE = '/research-groups';

export async function listMyResearchGroups(): Promise<ResearchGroup[]> {
  const res = await apiClient.get(BASE);
  return toArray<ResearchGroup>(res.data, ['items', 'groups', 'results']);
}

export async function getResearchGroup(id: string): Promise<ResearchGroup> {
  const res = await apiClient.get(`${BASE}/${id}`);
  // API may return { group, members } (detail) or just the group
  const d = res.data;
  return d?.group ?? d;
}

export async function createResearchGroup(payload: ResearchGroupCreate): Promise<ResearchGroup> {
  const res = await apiClient.post(BASE, payload);
  return res.data;
}

export async function getGroupDashboard(id: string): Promise<ResearchGroupDashboard> {
  try {
    const res = await apiClient.get(`${BASE}/${id}/dashboard`);
    return res.data;
  } catch {
    // Fallback: construct from group data
    const group = await getResearchGroup(id);
    return {
      group,
      members: [],
      projects: [],
      recent_discussions: [],
      document_collection_count: 0,
      challenge_count: 0,
    };
  }
}

// ─── Members ────────────────────────────────────────────────────────────────

/** Members come from the detail endpoint or dashboard. No dedicated GET list. */
export async function listMembers(groupId: string): Promise<ResearchMember[]> {
  try {
    // Try detail endpoint which returns { group, members }
    const res = await apiClient.get(`${BASE}/${groupId}`);
    const d = res.data;
    if (d?.members && Array.isArray(d.members)) return d.members;
    // fallback to dashboard
    const dash = await getGroupDashboard(groupId);
    return dash.members;
  } catch {
    return [];
  }
}

export async function addMember(groupId: string, payload: AddMemberPayload): Promise<ResearchMember> {
  const res = await apiClient.post(`${BASE}/${groupId}/members`, payload);
  return res.data;
}

export async function updateMemberRole(groupId: string, userId: string, role: string): Promise<void> {
  await apiClient.put(`${BASE}/${groupId}/members/${userId}/role`, { role });
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${groupId}/members/${userId}`);
}

export async function searchUsersForGroup(query: string): Promise<{ user_id: string; full_name: string; email: string }[]> {
  const res = await apiClient.get('/admin/users', { params: { search: query, limit: 20 } });
  const items = toArray<Record<string, unknown>>(res.data, ['items', 'users', 'results']);
  return items.map((u: Record<string, unknown>) => ({
    user_id: (u.id ?? u.user_global_id) as string,
    full_name: u.full_name as string,
    email: u.email as string,
  }));
}

// ─── Projects ───────────────────────────────────────────────────────────────

export async function listProjects(groupId: string): Promise<ResearchProject[]> {
  const res = await apiClient.get(`${BASE}/${groupId}/projects`);
  return toArray<ResearchProject>(res.data, ['items', 'projects', 'results']);
}

export async function createProject(groupId: string, payload: ProjectCreate): Promise<ResearchProject> {
  const res = await apiClient.post(`${BASE}/${groupId}/projects`, payload);
  return res.data;
}

export async function updateProject(_groupId: string, projectId: string, payload: Partial<ProjectCreate & { status: string }>): Promise<ResearchProject> {
  const res = await apiClient.put(`${BASE}/projects/${projectId}`, payload);
  return res.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`${BASE}/projects/${projectId}`);
}

export async function getProjectTasks(_groupId: string, projectId: string): Promise<ProjectTask[]> {
  const res = await apiClient.get(`${BASE}/projects/${projectId}/tasks`);
  return toArray<ProjectTask>(res.data, ['items', 'tasks', 'results']);
}

export async function createTask(_groupId: string, projectId: string, payload: TaskCreate): Promise<ProjectTask> {
  const res = await apiClient.post(`${BASE}/projects/${projectId}/tasks`, payload);
  return res.data;
}

export async function updateTask(_groupId: string, _projectId: string, taskId: string, payload: Partial<TaskCreate & { status: string }>): Promise<ProjectTask> {
  const res = await apiClient.put(`${BASE}/tasks/${taskId}`, payload);
  return res.data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`${BASE}/tasks/${taskId}`);
}

// ─── Challenges ─────────────────────────────────────────────────────────────

/**
 * NOTE: No GET /research-groups/{id}/challenges in the API.
 * challenge_count comes from the dashboard endpoint.
 * We try to fetch from the dashboard to build a list.
 */
export async function listGroupChallenges(groupId: string): Promise<ResearchChallenge[]> {
  try {
    // There's no dedicated list endpoint; try dashboard as fallback
    const res = await apiClient.get(`${BASE}/${groupId}/challenges`);
    return toArray<ResearchChallenge>(res.data, ['items', 'challenges', 'results']);
  } catch {
    return [];
  }
}

export async function createGroupChallenge(groupId: string, payload: ResearchChallengeCreate): Promise<ResearchChallenge> {
  const res = await apiClient.post(`${BASE}/${groupId}/challenges`, payload);
  return res.data;
}

// ─── Discussions ────────────────────────────────────────────────────────────

export async function listDiscussions(groupId: string): Promise<DiscussionThread[]> {
  const res = await apiClient.get(`${BASE}/${groupId}/discussions`);
  return toArray<DiscussionThread>(res.data, ['items', 'threads', 'discussions', 'results']);
}

export async function getDiscussionMessages(_groupId: string, threadId: string): Promise<DiscussionMessage[]> {
  const res = await apiClient.get(`${BASE}/discussions/${threadId}/messages`);
  return toArray<DiscussionMessage>(res.data, ['items', 'messages', 'results']);
}

export async function createDiscussion(groupId: string, payload: ThreadCreate): Promise<DiscussionThread> {
  const res = await apiClient.post(`${BASE}/${groupId}/discussions`, payload);
  return res.data;
}

export async function postDiscussionMessage(_groupId: string, threadId: string, content: string): Promise<DiscussionMessage> {
  const res = await apiClient.post(`${BASE}/discussions/${threadId}/messages`, { content });
  return res.data;
}
