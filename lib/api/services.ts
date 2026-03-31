import { apiClient } from './client';
import { toArray } from './response-utils';
import type {
  ProfileResponse,
  Hackathon,
  Notification,
  UnreadCountResponse,
  MarkNotificationsReadRequest,
} from '@/types/api';

// ─── Profile ─────────────────────────────────────────────

export async function getMyProfile(): Promise<ProfileResponse> {
  const { data } = await apiClient.get<ProfileResponse>('/users/me/profile');
  return data;
}

// ─── Hackathons ──────────────────────────────────────────

export interface HackathonListParams {
  status?: string;
  skip?: number;
  limit?: number;
}

export async function getHackathons(params?: HackathonListParams): Promise<Hackathon[]> {
  const { data } = await apiClient.get('/hackathons', { params });
  return toArray<Hackathon>(data, ['items', 'results', 'hackathons']);
}

export async function getHackathon(id: string): Promise<Hackathon> {
  const { data } = await apiClient.get<Hackathon>(`/hackathons/${id}`);
  return data;
}

// ─── Notifications ───────────────────────────────────────

export interface NotificationListParams {
  skip?: number;
  limit?: number;
  unread_only?: boolean;
}

export async function getNotifications(params?: NotificationListParams): Promise<Notification[]> {
  const { data } = await apiClient.get('/notifications', { params });
  return toArray<Notification>(data, ['items', 'results', 'notifications']);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await apiClient.get<UnreadCountResponse | { unread_count?: number } | number>('/notifications/unread-count');
  if (typeof data === 'number') return data;
  if (data && typeof data === 'object' && 'count' in data && typeof data.count === 'number') {
    return data.count;
  }
  if (data && typeof data === 'object' && 'unread_count' in data && typeof data.unread_count === 'number') {
    return data.unread_count;
  }
  return 0;
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  await apiClient.post<void>('/notifications/mark-read', {
    notification_ids: ids,
  } satisfies MarkNotificationsReadRequest);
}

// ─── AI Keys ─────────────────────────────────────────────

export interface AIKeyInfo {
  provider: string;
  configured_at: string;
}

export interface SaveAIKeyPayload {
  provider: string;
  api_key: string;
}

export async function getMyAIKeys(): Promise<AIKeyInfo[]> {

  const { data } = await apiClient.get<AIKeyInfo[] | { keys: AIKeyInfo[] }>('/auth/users/me/ai-keys');
  return Array.isArray(data) ? data : data?.keys ?? [];

}

export async function saveAIKey(payload: SaveAIKeyPayload): Promise<void> {
  await apiClient.put('/auth/users/me/ai-keys', payload);
}

export async function deleteAIKey(provider: string): Promise<void> {
  await apiClient.delete(`/auth/users/me/ai-keys/${provider}`);
}
