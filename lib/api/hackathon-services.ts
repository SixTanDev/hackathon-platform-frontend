import { apiClient } from './client';
import { toArray } from './response-utils';
import { getHackathons } from './services';
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

    { team_id: teamId ?? null }

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

export async function searchSedeMembers(query: string, sedeId?: string): Promise<SedeUserResult[]> {
  try {
    // Attempt global admin search first
    const { data } = await apiClient.get(
      '/admin/users',
      { params: { search: query, limit: 10 } }
    );
    return toArray<SedeUserResult>(data, ['items', 'users', 'results']);
  } catch (err: any) {
    // Fallback: If admin/users is blocked (403) and we have a sedeId, 
    // fetch all memberships for that sede and filter locally.
    if (err?.status === 403 && sedeId) {
      const { data } = await apiClient.get(`/sedes/${sedeId}/memberships`);
      const memberships = toArray<any>(data, ['items', 'memberships', 'results']);
      
      const search = query.toLowerCase();
      return memberships
        .filter(m => 
          m.full_name?.toLowerCase().includes(search) || 
          m.email?.toLowerCase().includes(search)
        )
        .slice(0, 10)
        .map(m => ({
          id: m.id,
          user_global_id: m.user_global_id,
          full_name: m.full_name,
          email: m.email,
        }));
    }
    return [];
  }
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


export async function getTutorTeams(params?: {
  status?: string;
  limit?: number;
}): Promise<MentorTeamSummary[]> {
  const hackathons = await getHackathons({
    status: params?.status,
    limit: params?.limit ?? 50,
  });

  if (!hackathons.length) {
    return [];
  }

  const teamResults = await Promise.allSettled(
    hackathons.map(async (hackathon) => {
      const teams = await getHackathonTeams(hackathon.id);

      return teams.map((team) => {
        const acceptedMembers = team.members?.filter((member) => member.status === 'accepted').length ?? 0;

        return {
          id: team.id,
          name: team.name,
          hackathon_id: hackathon.id,
          hackathon_name: hackathon.name,
          member_count: acceptedMembers,
          status: team.status,
          progress_percent: undefined,
        } satisfies MentorTeamSummary;
      });
    })
  );

  const uniqueTeams = new Map<string, MentorTeamSummary>();

  teamResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      result.value.forEach((team) => {
        uniqueTeams.set(team.id, team);
      });
    }
  });

  return Array.from(uniqueTeams.values());
}

export async function getStudentTeams(
  hackathonIds: string[],
  userId?: string | null
): Promise<MentorTeamSummary[]> {
  if (!userId || hackathonIds.length === 0) {
    return [];
  }

  const uniqueHackathonIds = [...new Set(hackathonIds)];

  const registrationResults = await Promise.allSettled(
    uniqueHackathonIds.map(async (hackathonId) => {
      const [registrations, hackathon] = await Promise.all([
        getHackathonRegistrations(hackathonId),
        getHackathon(hackathonId).catch(() => null),
      ]);

      const myRegistration = registrations.find(
        (registration) =>
          registration.user_global_id === userId &&
          registration.status !== 'cancelled' &&
          registration.team_id
      );

      return myRegistration
        ? {
            teamId: myRegistration.team_id as string,
            hackathonId,
            hackathonName: hackathon?.name,
          }
        : null;
    })
  );

  const assignedTeams = registrationResults.flatMap((result) => {
    if (result.status !== 'fulfilled' || !result.value) {
      return [];
    }

    return [result.value];
  });

  if (assignedTeams.length === 0) {
    return [];
  }

  const teamDetails = await Promise.allSettled(
    assignedTeams.map(async ({ teamId, hackathonId, hackathonName }) => {
      const team = await getTeamDetail(teamId);
      const acceptedMembers = team.members?.filter((member) => member.status === 'accepted').length ?? 0;

      return {
        id: team.id,
        name: team.name,
        hackathon_id: hackathonId,
        hackathon_name: hackathonName,
        member_count: acceptedMembers,
        status: team.status,
        progress_percent: undefined,
      } satisfies MentorTeamSummary;
    })
  );

  const uniqueTeams = new Map<string, MentorTeamSummary>();

  teamDetails.forEach((result) => {
    if (result.status === 'fulfilled') {
      uniqueTeams.set(result.value.id, result.value);
    }
  });

  return Array.from(uniqueTeams.values());
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
