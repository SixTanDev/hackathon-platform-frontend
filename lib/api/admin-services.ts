import apiClient from './client';
import { toArray, toListResult } from './response-utils';
import type {
  Sede,
  SedeUpdate,
  SedeMembership,
  RoleName,
  SedeAnalytics,
} from '@/types/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  user_global_id: string;
  full_name: string;
  email: string;
  role: RoleName;
  is_active: boolean;
  avatar_url?: string | null;
  joined_at: string;
  last_active_at?: string | null;
}

export interface AdminUserCreate {
  email: string;
  full_name: string;
  password: string;
  role: RoleName;
}

export interface BulkImportResult {
  created: number;
  errors: number;
  details: { row: number; email: string; error: string }[];
}

/** Shape returned by GET /api/v1/analytics/sede/students/{user_id} */
export interface StudentAnalytics {
  user_global_id: string;
  participation_history: {
    hackathon_id: string;
    hackathon_name?: string;
    status?: string;
    score?: number;
    rank?: number;
    challenges_completed?: number;
    joined_at?: string;
    [k: string]: unknown;
  }[];
  score_evolution: { date?: string; score?: number; [k: string]: unknown }[];
  solved_by_category: Record<string, number>;
  solved_by_difficulty: Record<string, number>;
  ai_usage: {
    hints_requested: number;
    document_interactions: number;
    total_interactions: number;
  };
  streaks: {
    current_streak_days: number;
    longest_streak_days: number;
  };
  badges: { id: string; slug: string; name: string; [k: string]: unknown }[];
  // Extra fields we may still use in the UI from admin-enriched endpoint
  [k: string]: unknown;
}

/** Shape returned by GET /api/v1/analytics/sede/overview */
export interface SedeOverviewAnalytics {
  users_total: number;
  users_by_role: Record<string, number>;
  hackathons_total: number;
  hackathons_active: number;
  hackathons_completed: number;
  hackathons_avg_participation: number;
  challenges_total: number;
  challenges_by_type: Record<string, number>;
  challenges_by_difficulty: Record<string, number>;
  average_resolution_rate: number;
  ai_interactions_total: number;
  ai_interactions_avg_per_student: number;
  ai_top_topics: { topic: string; count: number }[];
}

/** Shape returned by GET /api/v1/analytics/sede/hackathon/{id} */
export interface HackathonDetailAnalytics {
  hackathon_id: string;
  participation: {
    enrolled: number;
    active: number;
    completed_at_least_one: number;
  };
  score_distribution: {
    min_score: number;
    max_score: number;
    avg_score: number;
    p50_score: number;
    p90_score: number;
    buckets: { range: string; count: number }[];
  };
  easiest_challenge?: { name: string; pass_rate: number } | null;
  hardest_challenge?: { name: string; pass_rate: number } | null;
  average_time_per_challenge: { challenge_name?: string; avg_ms?: number; [k: string]: unknown }[];
  hints_used_per_challenge: { challenge_name?: string; hints?: number; [k: string]: unknown }[];
  submissions_timeline: { time: string; count: number }[];
  suspicious_pairs: { pair: [string, string]; similarity: number; challenge: string }[];
  [k: string]: unknown;
}

/** Shape from GET /superadmin/resource-requests or POST /admin/resource-requests */
export interface ResourceRequest {
  id: string;
  zone_id?: string;
  sede_id?: string;
  requested_by_user_id?: string;
  event_name: string;
  event_date: string;
  expected_students: number;
  expected_intensity: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'completed';
  approved_by_user_id?: string | null;
  approved_at?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  review_notes?: string | null;
  created_at: string;
  [k: string]: unknown;
}

export interface ResourceRequestCreate {
  event_name: string;
  event_date: string;
  expected_students: number;
  expected_intensity: 'low' | 'medium' | 'high';
}

export interface SedeConfig {
  default_hints_per_challenge: number;
  default_hint_cooldown_seconds: number;
  default_hint_penalty_pct: number;
  allowed_languages: string[];
  challenge_categories: string[];
}

/** Shape from GET /api/v1/health */
export interface HealthCheck {
  status: string;
  checks?: Record<string, { status: string; latency_ms?: number; detail?: string; [k: string]: unknown }>;
  services?: Record<string, { status: string; latency_ms?: number; detail?: string; [k: string]: unknown }>;
  celery?: { status: string; queue_depth?: number; active_workers?: number; failed_tasks?: number };
  server?: { status: string; uptime?: number; version?: string };
}

/** Audit log entry */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

/** Challenge review entry */
export interface ChallengeReview {
  id: string;
  challenge_id?: string;
  challenge_name?: string;
  status: string; // pending | approved | rejected
  requested_by?: string;
  requested_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  generation_request_id?: string;
  [k: string]: unknown;
}

/** Personal AI key */
export interface AIKeyInfo {
  provider: string;
  key_hint: string;
  is_active: boolean;
  created_at?: string;
}

// ─── Users ──────────────────────────────────────────────────────────────────

/** GET /admin/users — returns global users visible to admin */
export async function listAdminUsers(params?: { skip?: number; limit?: number }): Promise<{ items: AdminUser[]; total: number }> {
  const res = await apiClient.get('/admin/users', { params });
  return toListResult<AdminUser>(res.data, {
    arrayKeys: ['items', 'users', 'results'],
    totalKeys: ['total', 'count'],
  });
}

/** GET /admin/sedes/{sedeId}/members — returns memberships for this sede */
export interface SedeMemberEntry {
  id: string;
  user_global_id: string;
  sede_id: string;
  role: RoleName;
  is_active: boolean;
  joined_at: string;
}

export async function listSedeMembers(sedeId: string): Promise<SedeMemberEntry[]> {
  const res = await apiClient.get(`/admin/sedes/${sedeId}/members`);
  return toArray<SedeMemberEntry>(res.data, ['items', 'members', 'results']);
}

/** Legacy: list sede users — combines /admin/users + /admin/sedes/{id}/members client-side */
export async function listSedeUsers(sedeId: string, params?: { role?: string; search?: string; skip?: number; limit?: number }): Promise<{ items: AdminUser[]; total: number }> {
  const [usersRes, membersRes] = await Promise.all([
    apiClient.get('/admin/users', { params: { skip: params?.skip ?? 0, limit: params?.limit ?? 50 } }),
    apiClient.get(`/admin/sedes/${sedeId}/members`),
  ]);

  const rawUsers = toArray<Record<string, unknown>>(usersRes.data, ['items', 'users', 'results']);
  const rawMembers = toArray<SedeMemberEntry>(membersRes.data, ['items', 'members', 'results']);

  // Build a map of user_global_id -> membership info
  const memberMap = new Map<string, SedeMemberEntry>();
  for (const m of rawMembers) {
    memberMap.set(m.user_global_id, m);
  }

  // Join: only users who are members of this sede
  let items: AdminUser[] = rawUsers
    .filter((u: any) => memberMap.has(u.id))
    .map((u: any) => {
      const m = memberMap.get(u.id)!;
      return {
        id: m.id, // membership id
        user_global_id: u.id,
        full_name: u.full_name ?? '',
        email: u.email ?? '',
        role: m.role,
        is_active: m.is_active,
        avatar_url: u.avatar_url,
        joined_at: m.joined_at,
        last_active_at: null, // backend doesn't provide this
      };
    });

  // Also add members who weren't in the /admin/users page (they might be on later pages)
  // For those, create a placeholder
  for (const m of rawMembers) {
    if (!rawUsers.find((u: any) => u.id === m.user_global_id)) {
      items.push({
        id: m.id,
        user_global_id: m.user_global_id,
        full_name: `Usuario ${m.user_global_id.slice(0, 8)}`,
        email: '',
        role: m.role,
        is_active: m.is_active,
        avatar_url: null,
        joined_at: m.joined_at,
        last_active_at: null,
      });
    }
  }

  // Client-side filters
  if (params?.role && params.role !== 'all') {
    items = items.filter((u) => u.role === params.role);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    items = items.filter((u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }

  return { items, total: items.length };
}

export async function createSedeUser(payload: AdminUserCreate): Promise<AdminUser> {
  const res = await apiClient.post('/admin/users', payload);
  return res.data;
}

export async function assignExistingUser(sedeId: string, payload: { email: string; role: RoleName }): Promise<AdminUser> {
  const res = await apiClient.post(`/admin/sedes/${sedeId}/members`, payload);
  return res.data;
}

export async function updateUserRole(sedeId: string, membershipId: string, role: RoleName): Promise<void> {
  await apiClient.put(`/admin/sedes/${sedeId}/members/${membershipId}`, { role });
}

export async function deactivateUser(sedeId: string, membershipId: string): Promise<void> {
  await apiClient.delete(`/admin/sedes/${sedeId}/members/${membershipId}`);
}

export async function bulkImportUsers(sedeId: string, file: File): Promise<BulkImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post(`/admin/sedes/${sedeId}/members/bulk-import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// ─── Student Analytics ──────────────────────────────────────────────────────

export async function getStudentAnalytics(userId: string): Promise<StudentAnalytics> {
  const res = await apiClient.get(`/analytics/sede/students/${userId}`);
  return res.data;
}

// ─── Sede Config ────────────────────────────────────────────────────────────

export async function getSede(sedeId: string): Promise<Sede> {
  const res = await apiClient.get(`/sedes/${sedeId}`);
  return res.data;
}

export async function updateSede(sedeId: string, payload: SedeUpdate): Promise<Sede> {
  const res = await apiClient.put(`/admin/sedes/${sedeId}`, payload);
  return res.data;
}

export async function getSedeConfig(sedeId: string): Promise<SedeConfig> {
  try {
    const sede = await getSede(sedeId);
    const cfg = (sede.config_json ?? {}) as Record<string, unknown>;
    return {
      default_hints_per_challenge: (cfg.default_hints_per_challenge as number) ?? 3,
      default_hint_cooldown_seconds: (cfg.default_hint_cooldown_seconds as number) ?? 60,
      default_hint_penalty_pct: (cfg.default_hint_penalty_pct as number) ?? 10,
      allowed_languages: (cfg.allowed_languages as string[]) ?? ['python', 'javascript', 'java'],
      challenge_categories: (cfg.challenge_categories as string[]) ?? ['algoritmos', 'estructuras_datos', 'bases_datos', 'web', 'ia'],
    };
  } catch {
    return {
      default_hints_per_challenge: 3,
      default_hint_cooldown_seconds: 60,
      default_hint_penalty_pct: 10,
      allowed_languages: ['python', 'javascript', 'java'],
      challenge_categories: ['algoritmos', 'estructuras_datos', 'bases_datos', 'web', 'ia'],
    };
  }
}

export async function updateSedeConfig(sedeId: string, config: SedeConfig): Promise<Sede> {
  return updateSede(sedeId, { config_json: config as unknown as Record<string, unknown> });
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export async function getSedeOverviewAnalytics(): Promise<SedeOverviewAnalytics> {
  const res = await apiClient.get('/analytics/sede/overview');
  return res.data;
}

export async function getHackathonAnalytics(hackathonId: string): Promise<HackathonDetailAnalytics> {
  const res = await apiClient.get(`/analytics/sede/hackathon/${hackathonId}`);
  return res.data;
}

// ─── Health ─────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthCheck> {
  const res = await apiClient.get('/health');
  return res.data;
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export async function getAuditLog(params?: { page?: number; page_size?: number }): Promise<{ items: AuditLogEntry[]; total: number }> {
  const res = await apiClient.get('/admin/audit-log', { params });
  return toListResult<AuditLogEntry>(res.data, {
    arrayKeys: ['items', 'logs', 'entries', 'results'],
    totalKeys: ['total', 'count'],
  });
}

// ─── Challenge Reviews ──────────────────────────────────────────────────────

export async function getChallengeReviews(params?: { status?: string }): Promise<ChallengeReview[]> {
  const res = await apiClient.get('/admin/challenge-reviews', { params });
  return toArray<ChallengeReview>(res.data, ['items', 'reviews', 'results']);
}

// ─── Resource Requests ──────────────────────────────────────────────────────

/**
 * NOTE: The admin API only supports POST /admin/resource-requests (create).
 * There is no GET endpoint for listing admin's own requests.
 * SuperAdmin has GET /superadmin/resource-requests.
 * We attempt the admin endpoint anyway and gracefully handle a 404/405.
 */
export async function listResourceRequests(): Promise<ResourceRequest[]> {
  try {
    const res = await apiClient.get('/admin/resource-requests');
    return toArray<ResourceRequest>(res.data, ['items', 'requests', 'results']);
  } catch {
    // No list endpoint for admin — return empty
    return [];
  }
}

export async function createResourceRequest(payload: ResourceRequestCreate): Promise<ResourceRequest> {
  const res = await apiClient.post('/admin/resource-requests', payload);
  return res.data;
}

// ─── Personal AI Keys ───────────────────────────────────────────────────────

export async function getPersonalAIKeys(): Promise<AIKeyInfo[]> {
  try {
    const res = await apiClient.get('/auth/users/me/ai-keys');
    return toArray<AIKeyInfo>(res.data, ['keys', 'items', 'results']);
  } catch {
    try {
      const res = await apiClient.get('/ai/personal-keys');
      return toArray<AIKeyInfo>(res.data, ['keys', 'items', 'results']);
    } catch {
      return [];
    }
  }
}

export async function savePersonalAIKey(provider: string, apiKey: string): Promise<void> {
  try {
    await apiClient.put('/auth/users/me/ai-keys', { provider, api_key: apiKey });
  } catch {
    await apiClient.post('/ai/personal-keys', { provider, api_key: apiKey });
  }
}

export async function deletePersonalAIKey(provider: string): Promise<void> {
  try {
    await apiClient.delete(`/auth/users/me/ai-keys/${provider}`);
  } catch {
    await apiClient.delete(`/ai/personal-keys/${provider}`);
  }
}
