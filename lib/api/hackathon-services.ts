import { apiClient } from './client';
import { toArray } from './response-utils';
import type {
  Hackathon,
  HackathonChallenge,
  Registration,
  Team,
  TeamCreate,
  TeamListResponse,
  TeamMember,
  LeaderboardEntry,
  LeaderboardResponse,
  LeaderboardEntryResponse,
  ChallengePublic,
} from '@/types/api';

// ─── Hackathon Detail ───────────────────────────────────────────────────────

export async function getHackathon(id: string): Promise<Hackathon> {
  const { data } = await apiClient.get<Hackathon>(`/hackathons/${id}`);
  return data;
}

// ─── Hackathon Challenges ───────────────────────────────────────────────────

export interface HackathonChallengeWithDetail extends HackathonChallenge {
  challenge?: ChallengePublic;
}

export async function getHackathonChallenges(hackathonId: string): Promise<HackathonChallengeWithDetail[]> {

  const { data } = await apiClient.get<HackathonChallengeWithDetail[] | { challenges: HackathonChallengeWithDetail[] }>(
    `/hackathons/${hackathonId}/challenges`
  );
  return Array.isArray(data) ? data : data?.challenges ?? [];
}

// ─── Registrations ──────────────────────────────────────────────────────────

export async function getHackathonRegistrations(hackathonId: string): Promise<Registration[]> {

  const { data } = await apiClient.get<Registration[] | { registrations: Registration[] }>(
    `/hackathons/${hackathonId}/registrations`
  );
  return Array.isArray(data) ? data : data?.registrations ?? [];
}

export async function registerForHackathon(
  hackathonId: string,
  teamId?: string | null
): Promise<Registration> {
  const { data } = await apiClient.post<Registration>(
    `/hackathons/${hackathonId}/register`,
    teamId ? { team_id: teamId } : {}
  );
  return data;
}

export async function cancelRegistration(hackathonId: string): Promise<void> {
  await apiClient.delete(`/hackathons/${hackathonId}/register`);
}

// ─── Teams ──────────────────────────────────────────────────────────────────

export async function getHackathonTeams(hackathonId: string): Promise<Team[]> {
  const { data } = await apiClient.get<Team[] | TeamListResponse>(
    `/hackathons/${hackathonId}/teams`
  );
  return toArray<Team>(data, ['teams', 'items', 'results']);
}

export async function createTeam(hackathonId: string, payload: TeamCreate): Promise<Team> {
  const { data } = await apiClient.post<Team>(
    `/hackathons/${hackathonId}/teams`,
    payload
  );
  return data;
}

export async function getTeamDetail(teamId: string): Promise<Team> {
  const { data } = await apiClient.get<Team>(`/teams/${teamId}`);
  return data;
}

export async function inviteToTeam(
  teamId: string,
  payload: { user_global_id?: string; email?: string }
): Promise<void> {
  await apiClient.post(`/teams/${teamId}/invite`, payload);
}

export async function acceptInvitation(teamId: string, invitationId: string): Promise<void> {
  await apiClient.post(`/teams/${teamId}/invitations/${invitationId}/accept`);
}

export async function declineInvitation(teamId: string, invitationId: string): Promise<void> {
  await apiClient.post(`/teams/${teamId}/invitations/${invitationId}/decline`);
}

// ─── Team Messages ──────────────────────────────────────────────────────────

export interface TeamMessage {
  id: string;
  team_id: string;
  user_global_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

export async function getTeamMessages(teamId: string): Promise<TeamMessage[]> {
  const { data } = await apiClient.get(`/teams/${teamId}/messages`);
  return toArray<TeamMessage>(data, ['items', 'messages', 'results']);
}

export async function sendTeamMessage(teamId: string, content: string): Promise<TeamMessage> {
  const { data } = await apiClient.post<TeamMessage>(`/teams/${teamId}/messages`, { content });
  return data;
}

// ─── Team Progress ──────────────────────────────────────────────────────────

export interface TeamProgressEntry {
  user_global_id: string;
  display_name?: string;
  challenges_solved: number;
  total_points: number;
  last_submission_at?: string | null;
}

export async function getTeamProgress(teamId: string): Promise<TeamProgressEntry[]> {
  const { data } = await apiClient.get(`/teams/${teamId}/progress`);
  return toArray<TeamProgressEntry>(data, ['items', 'progress', 'results']);
}

// ─── Leaderboard ────────────────────────────────────────────────────────────

export async function getHackathonLeaderboard(
  hackathonId: string,
  type: 'individual' | 'team' = 'individual'
): Promise<LeaderboardEntry[]> {
  const { data } = await apiClient.get(
    `/hackathons/${hackathonId}/leaderboard`,
    { params: { type } }
  );
  return toArray<LeaderboardEntry>(data, ['entries', 'items', 'results']);
}

// ─── Team Member Removal ─────────────────────────────────────────────────

export async function removeTeamMember(teamId: string, memberId: string): Promise<void> {
  await apiClient.delete(`/teams/${teamId}/members/${memberId}`);
}

// ─── Search Sede Members ─────────────────────────────────────────────────

export interface SedeUserResult {
  id: string;
  user_global_id: string;
  full_name: string;
  email: string;
}

export async function searchSedeMembers(query: string): Promise<SedeUserResult[]> {
  // Use admin users endpoint with search to find sede members
  const { data } = await apiClient.get(
    '/admin/users',
    { params: { search: query, limit: 10 } }
  );
  return toArray<SedeUserResult>(data, ['items', 'users', 'results']);
}

// ─── Mentor: My Assigned Teams ───────────────────────────────────────────

export interface MentorTeamSummary {
  id: string;
  name: string;
  hackathon_id: string;
  hackathon_name?: string;
  member_count: number;
  status: string;
  progress_percent?: number;
}

export async function getMentorTeams(): Promise<MentorTeamSummary[]> {
  const { data } = await apiClient.get(
    '/teams/assigned'
  );
  return toArray<MentorTeamSummary>(data, ['items', 'teams', 'results']);
}

// ─── Sede / Zone Leaderboard ──────────────────────────────────────────────

export async function getSedeLeaderboard(
  sedeId: string,
  page = 1,
  limit = 50
): Promise<LeaderboardResponse> {
  const { data } = await apiClient.get<LeaderboardResponse>(
    `/leaderboards/sede/${sedeId}`,
    { params: { page, limit } }
  );
  return data;
}

export async function getZoneLeaderboard(
  page = 1,
  limit = 50
): Promise<LeaderboardResponse> {
  const { data } = await apiClient.get<LeaderboardResponse>(
    '/leaderboards/zone',
    { params: { page, limit } }
  );
  return data;
}
