import apiClient from './client';
import { toArray, toListResult } from './response-utils';
import type {
  Hackathon,
  HackathonCreate,
  HackathonUpdate,
  HackathonStatus,
  HackathonChallenge,
  ChallengePublic,
  FlashChallenge,
  DocumentCollection,
} from '@/types/api';

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createHackathon(payload: HackathonCreate): Promise<Hackathon> {
  const { data } = await apiClient.post<Hackathon>('/hackathons', payload);
  return data;
}

export async function updateHackathon(id: string, payload: HackathonUpdate): Promise<Hackathon> {
  const { data } = await apiClient.patch<Hackathon>(`/hackathons/${id}`, payload);
  return data;
}

export async function deleteHackathon(id: string): Promise<void> {
  await apiClient.delete(`/hackathons/${id}`);
}

export async function getHackathon(id: string): Promise<Hackathon> {
  const { data } = await apiClient.get<Hackathon>(`/hackathons/${id}`);
  return data;
}

export async function listHackathons(params?: {
  status?: string;
  skip?: number;
  limit?: number;
  search?: string;
}): Promise<{ items: Hackathon[]; total: number }> {
  const res = await apiClient.get('/hackathons', { params });
  return toListResult<Hackathon>(res.data, {
    arrayKeys: ['items', 'hackathons', 'results'],
    totalKeys: ['total', 'count'],
  });
}

// ─── State Transitions ───────────────────────────────────────────────────────

export async function transitionHackathon(
  id: string,
  targetStatus: HackathonStatus
): Promise<Hackathon> {
  const { data } = await apiClient.patch<Hackathon>(`/hackathons/${id}/status`, {
    target_status: targetStatus,
  });
  return data;
}

export async function finalizeHackathon(id: string): Promise<Hackathon> {
  const { data } = await apiClient.post<Hackathon>(`/hackathons/${id}/finalize`);
  return data;
}

// ─── Challenge Assignment ────────────────────────────────────────────────────

export interface AddChallengePayload {
  challenge_id: string;
  order_index: number;
  points_override?: number | null;
  is_flash?: boolean;
}

export async function listHackathonChallenges(
  hackathonId: string
): Promise<HackathonChallenge[]> {
  const res = await apiClient.get(`/hackathons/${hackathonId}/challenges`);
  return toArray<HackathonChallenge>(res.data, ['items', 'challenges', 'results']);
}

export async function addChallengeToHackathon(
  hackathonId: string,
  payload: AddChallengePayload
): Promise<HackathonChallenge> {
  const { data } = await apiClient.post<HackathonChallenge>(
    `/hackathons/${hackathonId}/challenges`,
    payload
  );
  return data;
}

export async function removeChallengeFromHackathon(
  hackathonId: string,
  challengeId: string
): Promise<void> {
  await apiClient.delete(`/hackathons/${hackathonId}/challenges/${challengeId}`);
}

// ─── Challenge Library (sede-scoped) ─────────────────────────────────────────

export interface ChallengeLibraryParams {
  type?: string;
  difficulty?: string;
  category?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export async function getChallengeLibrary(
  params?: ChallengeLibraryParams
): Promise<ChallengePublic[]> {
  const res = await apiClient.get('/challenges', { params });
  return toArray<ChallengePublic>(res.data, ['items', 'results', 'challenges']);
}

// ─── Registrations ───────────────────────────────────────────────────────────

export interface RegistrationEntry {
  id: string;
  hackathon_id: string;
  user_global_id: string;
  sede_id: string;
  team_id: string | null;
  registered_at: string;
  status: string;
}

export async function listRegistrations(hackathonId: string): Promise<RegistrationEntry[]> {
  const res = await apiClient.get(`/hackathons/${hackathonId}/registrations`);
  return toArray<RegistrationEntry>(res.data, ['items', 'registrations', 'results']);
}

// ─── Mentors / Judges ────────────────────────────────────────────────────────

export interface HackathonMentor {
  id: string;
  user_global_id: string;
  full_name?: string;
  email?: string;
  role_in_hackathon: 'mentor' | 'judge' | 'organizer';
}

export async function getHackathonMentors(hackathonId: string): Promise<HackathonMentor[]> {
  const res = await apiClient.get(`/hackathons/${hackathonId}/mentors`);
  return toArray<HackathonMentor>(res.data, ['items', 'mentors', 'results']);
}

export async function addHackathonMentor(
  hackathonId: string,
  payload: { user_global_id: string; role_in_hackathon: string }
): Promise<void> {
  await apiClient.post(`/hackathons/${hackathonId}/mentors`, payload);
}

export async function removeHackathonMentor(
  hackathonId: string,
  userGlobalId: string
): Promise<void> {
  await apiClient.delete(`/hackathons/${hackathonId}/mentors/${userGlobalId}`);
}

// ─── Sede Access ─────────────────────────────────────────────────────────────

export interface SedeAccessEntry {
  sede_id: string;
  sede_name?: string;
  granted_at?: string;
}

export async function listSedeAccess(hackathonId: string): Promise<SedeAccessEntry[]> {
  const res = await apiClient.get(`/hackathons/${hackathonId}/sede-access`);
  return toArray<SedeAccessEntry>(res.data, ['items', 'sedes', 'results']);
}

export async function grantSedeAccess(
  hackathonId: string,
  sedeId: string
): Promise<void> {
  await apiClient.post(`/hackathons/${hackathonId}/sede-access`, { sede_id: sedeId });
}

export async function revokeSedeAccess(
  hackathonId: string,
  sedeId: string
): Promise<void> {
  await apiClient.delete(`/hackathons/${hackathonId}/sede-access/${sedeId}`);
}

// ─── Flash Challenges ────────────────────────────────────────────────────────
// Flash challenges are regular challenges assigned with is_flash=true
// via POST /hackathons/{id}/challenges

export interface CreateFlashChallengePayload {
  challenge_id: string;
  duration_minutes: number;
  points_multiplier: number;
}

export async function createFlashChallenge(
  hackathonId: string,
  payload: CreateFlashChallengePayload
): Promise<HackathonChallenge> {
  // Use the challenge assignment endpoint with is_flash flag
  const { data } = await apiClient.post<HackathonChallenge>(
    `/hackathons/${hackathonId}/challenges`,
    {
      challenge_id: payload.challenge_id,
      order_index: 999, // flash challenges go at end
      is_flash: true,
      points_override: null,
      // The backend may use duration_minutes and points_multiplier from config_json
    }
  );
  return data;
}

// ─── Monitor Stats ───────────────────────────────────────────────────────────
// NOTE: No dedicated /monitor endpoint exists in the backend.
// We assemble monitor data from available endpoints.

export interface MonitorStats {
  total_enrolled: number;
  total_challenges: number;
  registrations: RegistrationEntry[];
  challenges: HackathonChallenge[];
  mentors: HackathonMentor[];
}

export async function getMonitorStats(hackathonId: string): Promise<MonitorStats> {
  const [registrations, challenges, mentors] = await Promise.all([
    listRegistrations(hackathonId).catch(() => []),
    listHackathonChallenges(hackathonId).catch(() => []),
    getHackathonMentors(hackathonId).catch(() => []),
  ]);

  return {
    total_enrolled: registrations.length,
    total_challenges: challenges.length,
    registrations,
    challenges,
    mentors,
  };
}

// ─── Document Collections ────────────────────────────────────────────────────

export async function getDocumentCollections(): Promise<DocumentCollection[]> {
  const res = await apiClient.get('/document-collections');
  return toArray<DocumentCollection>(res.data, ['collections', 'items', 'results']);
}
