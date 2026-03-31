import { apiClient } from './client';
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
  const { data } = await apiClient.get<Hackathon[]>('/hackathons', { params });
  return Array.isArray(data) ? data : (data as any)?.hackathons ?? [];
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
  const { data } = await apiClient.get<Notification[]>('/notifications', { params });
  return Array.isArray(data) ? data : (data as any)?.notifications ?? [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
  return data?.count ?? 0;
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
