import apiClient from './client';
import type { Zone, ZoneCreate, ZoneUpdate, ZoneWithStats, Sede, SedeCreate, SedeUpdate, RoleName } from '@/types/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HealthServiceItem {
  status: string;
  latency_ms?: number;
  detail?: string;
  [key: string]: unknown;
}

export interface HealthDetailed {
  status: string;
  server?: { status: string; uptime?: number; version?: string };
  database: HealthServiceItem & { connections_active?: number; connections_max?: number };
  redis: HealthServiceItem & { connected: boolean; memory_used?: string };
  minio: HealthServiceItem & { storage_used?: string; storage_available?: string };
  celery: { status: string; queue_depth: number; active_workers: number; failed_tasks: number };
  code_execution: HealthServiceItem & { warm_containers: number; max_containers: number; docker_connected?: boolean };
  ai_models?: HealthServiceItem;
  storage?: HealthServiceItem;
}

export interface PlatformOverviewZone {
  zone_id: string;
  zone_name: string;
  sede_count: number;
  user_count: number;
  hackathon_count: number;
}

export interface PlatformOverview {
  total_zones: number;
  total_sedes: number;
  total_users: number;
  active_hackathons: number;
  pending_resource_requests: number;
  pending_support_tickets: number;
  zones: PlatformOverviewZone[];
  ai_usage?: Record<string, unknown>;
  upcoming_events?: unknown[];
}

export interface ZoneListItem extends Zone {
  sede_count: number;
  user_count: number;
  hackathon_count: number;
  events_this_month: number;
}

export interface ZoneDetail extends Zone {
  sedes: SedeInZone[];
  stats: { sede_count: number; user_count: number; hackathon_count: number; events_this_month: number };
}

export interface SedeInZone extends Sede {
  zone_id: string;
  zone_name: string;
  user_count: number;
  active_hackathons: number;
}

export interface CrossZoneSede {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  is_active: boolean;
  zone_id: string;
  zone_name: string;
  zone_code: string;
  users_total: number;
  hackathons_total: number;
}

export interface SuperAdminResourceRequest {
  id: string;
  sede_id: string;
  sede_name: string;
  zone_name: string;
  event_name: string;
  event_date: string;
  expected_students: number;
  intensity: 'low' | 'medium' | 'high' | 'extreme';
  status: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'completed';
  notes?: string | null;
  cost_report_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApproveResourcePayload {
  scheduled_start: string;
  scheduled_end: string;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  sede_id?: string | null;
  sede_name?: string | null;
  zone_id?: string | null;
  zone_name?: string | null;
  ip_address?: string | null;
  is_impersonation: boolean;
  details?: Record<string, unknown> | null;
}

export interface AuditLogParams {
  search?: string;
  user_id?: string;
  action?: string;
  entity_type?: string;
  zone_id?: string;
  sede_id?: string;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}

export interface ImpersonateResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  impersonated_user_id: string;
  impersonated_user_email: string;
  // Some backends may also return these:
  refresh_token?: string;
  context_token?: string;
  impersonated_user?: {
    id: string;
    full_name: string;
    email: string;
    role: RoleName;
    sede_name: string;
  };
}

export interface SedeMember {
  id: string;
  user_global_id: string;
  sede_id: string;
  role: RoleName;
  is_active: boolean;
  joined_at: string;
}

export interface ResolvedUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_superadmin: boolean;
  is_active: boolean;
}

export interface ZoneProvisionStatus {
  step: string;
  progress: number;
  message: string;
  completed: boolean;
  error?: string;
}

// ─── Platform Overview ──────────────────────────────────────────────────────

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const { data } = await apiClient.get('/analytics/global/overview');

  // Backend returns { totals: { zone_count, sede_count, user_count, active_hackathon_count }, zones: [...], ai_usage?, upcoming_events? }
  const totals = data?.totals ?? {};
  const zones: PlatformOverviewZone[] = (data?.zones ?? []).map((z: any) => ({
    zone_id: z.zone_id ?? z.id ?? '',
    zone_name: z.zone_name ?? z.name ?? '',
    sede_count: z.sede_count ?? z.sedes ?? 0,
    user_count: z.user_count ?? z.users ?? z.students ?? 0,
    hackathon_count: z.hackathon_count ?? z.active_hackathons ?? 0,
  }));

  return {
    total_zones: totals.zone_count ?? totals.total_zones ?? zones.length,
    total_sedes: totals.sede_count ?? totals.total_sedes ?? 0,
    total_users: totals.user_count ?? totals.total_users ?? 0,
    active_hackathons: totals.active_hackathon_count ?? totals.active_hackathons ?? 0,
    pending_resource_requests: data?.pending_resource_requests ?? 0,
    pending_support_tickets: data?.pending_support_tickets ?? 0,
    zones,
    ai_usage: data?.ai_usage,
    upcoming_events: data?.upcoming_events,
  };
}

export async function getHealthDetailed(): Promise<HealthDetailed> {
  const { data } = await apiClient.get('/health/detailed');

  // Backend returns { status, services: { database, redis, minio, code_execution_pool, ai_models, storage }, celery, server }
  // Also handle legacy format with `checks` key
  const svc = data?.services ?? data?.checks ?? {};
  const dbCheck = svc.database ?? svc.shared_db ?? svc.tenant_sample_db ?? {};
  const redisCheck = svc.redis ?? {};
  const minioCheck = svc.minio ?? {};
  const codeCheck = svc.code_execution_pool ?? svc.code_execution_service ?? svc.code_execution ?? {};
  const celeryCheck = data?.celery ?? svc.celery ?? {};
  const serverCheck = data?.server ?? {};
  const aiModels = svc.ai_models ?? {};
  const storageCheck = svc.storage ?? {};

  return {
    status: data?.status ?? 'unknown',
    server: serverCheck.status ? {
      status: serverCheck.status,
      uptime: serverCheck.uptime,
      version: serverCheck.version,
    } : undefined,
    database: {
      status: dbCheck.status ?? 'unknown',
      latency_ms: dbCheck.latency_ms,
      detail: dbCheck.detail,
      connections_active: dbCheck.connections_active ?? dbCheck.details?.connections_active ?? 0,
      connections_max: dbCheck.connections_max ?? dbCheck.details?.connections_max ?? 0,
    },
    redis: {
      status: redisCheck.status ?? 'unknown',
      connected: redisCheck.connected ?? redisCheck.status === 'ok',
      latency_ms: redisCheck.latency_ms,
      memory_used: redisCheck.memory_used ?? redisCheck.details?.memory_used,
    },
    minio: {
      status: minioCheck.status ?? 'unknown',
      latency_ms: minioCheck.latency_ms,
      storage_used: minioCheck.storage_used ?? minioCheck.details?.storage_used,
      storage_available: minioCheck.storage_available ?? minioCheck.details?.storage_available,
    },
    celery: {
      status: celeryCheck.status ?? 'unknown',
      queue_depth: celeryCheck.queue_depth ?? celeryCheck.details?.queue_depth ?? 0,
      active_workers: celeryCheck.active_workers ?? celeryCheck.details?.active_workers ?? 0,
      failed_tasks: celeryCheck.failed_tasks ?? celeryCheck.details?.failed_tasks ?? 0,
    },
    code_execution: {
      status: codeCheck.status ?? 'unknown',
      warm_containers: codeCheck.warm_containers ?? codeCheck.details?.warm_containers ?? 0,
      max_containers: codeCheck.max_containers ?? codeCheck.details?.max_containers ?? 0,
      docker_connected: codeCheck.docker_connected ?? codeCheck.details?.docker_connected,
    },
    ai_models: aiModels.status ? aiModels : undefined,
    storage: storageCheck.status ? storageCheck : undefined,
  };
}

// ─── Zone Management ────────────────────────────────────────────────────────

export async function listZones(): Promise<ZoneListItem[]> {
  const { data } = await apiClient.get('/admin/zones');
  const items = Array.isArray(data) ? data : data?.items ?? data?.zones ?? [];
  // Map API fields to expected ZoneListItem shape
  return items.map((z: any) => ({
    ...z,
    sede_count: z.sede_count ?? z.sedes ?? 0,
    user_count: z.user_count ?? z.users ?? 0,
    hackathon_count: z.hackathon_count ?? z.active_hackathons ?? 0,
    events_this_month: z.events_this_month ?? z.hackathon_count ?? z.active_hackathons ?? 0,
  }));
}

export async function getZoneDetail(zoneId: string): Promise<ZoneDetail> {
  const { data } = await apiClient.get(`/admin/zones/${zoneId}`);
  return data;
}

export async function createZone(payload: ZoneCreate): Promise<Zone> {
  const { data } = await apiClient.post('/admin/zones', payload);
  return data;
}

export async function updateZone(zoneId: string, payload: ZoneUpdate): Promise<Zone> {
  const { data } = await apiClient.put(`/admin/zones/${zoneId}`, payload);
  return data;
}

export async function deactivateZone(zoneId: string): Promise<void> {
  await apiClient.post(`/admin/zones/${zoneId}/deactivate`);
}

export async function getZoneProvisionStatus(zoneId: string): Promise<ZoneProvisionStatus> {
  // Bootstrap status can be polled from the zone detail endpoint
  const { data } = await apiClient.get(`/admin/zones/${zoneId}`);
  return {
    step: data?.provision_step ?? 'complete',
    progress: data?.provision_progress ?? 100,
    message: data?.provision_message ?? 'Zona lista',
    completed: true,
  };
}

// ─── Cross-zone Sede Management ─────────────────────────────────────────────

export async function listAllSedes(params?: { zone_id?: string; search?: string; skip?: number; limit?: number }): Promise<{ items: CrossZoneSede[]; total: number }> {
  const { data } = await apiClient.get('/admin/sedes', { params });
  const raw = Array.isArray(data) ? data : data?.items ?? data?.sedes ?? [];
  const items: CrossZoneSede[] = raw.map((s: any) => ({
    ...s,
    users_total: s.users_total ?? s.user_count ?? 0,
    hackathons_total: s.hackathons_total ?? s.hackathon_count ?? 0,
  }));
  return { items, total: Array.isArray(data) ? data.length : data?.total ?? items.length };
}

/**
 * Create a sede within a zone. SuperAdmin sends X-Zone-Id via the interceptor
 * (from superadminSelectedZone). No X-Context-Token needed.
 */
export async function createSede(payload: SedeCreate): Promise<Sede> {
  const { data } = await apiClient.post('/admin/sedes', payload);
  return data;
}

/**
 * Update an existing sede. X-Zone-Id is sent automatically via the interceptor.
 */
export async function updateSede(sedeId: string, payload: SedeUpdate): Promise<Sede> {
  const { data } = await apiClient.put(`/admin/sedes/${sedeId}`, payload);
  return data;
}

/**
 * Delete (soft-delete) a sede. X-Zone-Id is sent automatically via the interceptor.
 */
export async function deleteSede(sedeId: string): Promise<void> {
  await apiClient.delete(`/admin/sedes/${sedeId}`);
}

/**
 * Create an admin user for a sede.
 * POST /admin/sedes/{sede_id}/admin-users
 * Returns 409 if email already exists.
 */
export interface CreateSedeAdminPayload {
  email: string;
  full_name: string;
  password: string;
  avatar_url?: string | null;
}

export async function createSedeAdmin(sedeId: string, payload: CreateSedeAdminPayload): Promise<unknown> {
  const { data } = await apiClient.post(`/admin/sedes/${sedeId}/admin-users`, payload);
  return data;
}

// ─── Sede Members ───────────────────────────────────────────────────────────

/**
 * List members of a sede. X-Zone-Id is sent automatically via the interceptor.
 */
export async function listSedeMembers(sedeId: string): Promise<SedeMember[]> {
  const { data } = await apiClient.get(`/admin/sedes/${sedeId}/members`);
  const items = Array.isArray(data) ? data : data?.items ?? data?.members ?? [];
  return items;
}

/**
 * Resolve user details by ID.
 */
export async function resolveUser(userId: string): Promise<ResolvedUser> {
  const { data } = await apiClient.get(`/admin/users/${userId}`);
  return data;
}

// ─── Impersonation ──────────────────────────────────────────────────────────

export async function impersonateUser(userId: string): Promise<ImpersonateResponse> {
  const { data } = await apiClient.post(`/auth/superadmin/impersonate/${userId}`);
  return data;
}

export async function endImpersonation(): Promise<void> {
  await apiClient.post('/auth/logout');
}

// ─── Resource Requests (SuperAdmin) ─────────────────────────────────────────

export async function listAllResourceRequests(params?: { status?: string; skip?: number; limit?: number }): Promise<{ items: SuperAdminResourceRequest[]; total: number }> {
  const { data } = await apiClient.get('/superadmin/resource-requests', { params });
  return data;
}

export async function approveResourceRequest(id: string, payload: ApproveResourcePayload): Promise<SuperAdminResourceRequest> {
  const { data } = await apiClient.post(`/superadmin/resource-requests/${id}/approve`, payload);
  return data;
}

export async function rejectResourceRequest(id: string, reason: string): Promise<SuperAdminResourceRequest> {
  // Use the approve endpoint with a rejection status as the API provides only the approve action
  const { data } = await apiClient.post(`/superadmin/resource-requests/${id}/approve`, { status: 'rejected', notes: reason });
  return data;
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export async function getAuditLog(params?: AuditLogParams): Promise<{ items: AuditLogEntry[]; total: number }> {
  const { data } = await apiClient.get('/admin/audit-log', { params });
  return data;
}