import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// ─── Query Key Factory ─────────────────────────────────────────────────────

export const queryKeys = {
  // Auth
  auth: {
    me: ['auth', 'me'] as const,
    memberships: ['auth', 'memberships'] as const,
  },

  // Hackathons
  hackathons: {
    all: ['hackathons'] as const,
    list: (params?: Record<string, unknown>) => ['hackathons', 'list', params] as const,
    detail: (id: string) => ['hackathons', 'detail', id] as const,
    challenges: (id: string) => ['hackathons', id, 'challenges'] as const,
    registrations: (id: string) => ['hackathons', id, 'registrations'] as const,
    leaderboard: (id: string) => ['hackathons', id, 'leaderboard'] as const,
    teams: (id: string) => ['hackathons', id, 'teams'] as const,
    mentors: (id: string) => ['hackathons', id, 'mentors'] as const,
  },

  // Challenges
  challenges: {
    all: ['challenges'] as const,
    list: (params?: Record<string, unknown>) => ['challenges', 'list', params] as const,
    detail: (id: string) => ['challenges', 'detail', id] as const,
    testCases: (id: string) => ['challenges', id, 'test-cases'] as const,
    library: (params?: Record<string, unknown>) => ['challenges', 'library', params] as const,
  },

  // Admin hackathon management
  adminHackathons: {
    monitor: (id: string) => ['admin', 'hackathons', id, 'monitor'] as const,
    mentors: (id: string) => ['admin', 'hackathons', id, 'mentors'] as const,
  },

  // Admin challenge management
  adminChallenges: {
    all: ['admin', 'challenges'] as const,
    reviews: (status?: string) => ['admin', 'challenges', 'reviews', status] as const,
    aiGenerated: ['admin', 'challenges', 'ai-generated'] as const,
    similar: (title: string, category?: string) => ['admin', 'challenges', 'similar', title, category] as const,
    solution: (id: string) => ['admin', 'challenges', id, 'solution'] as const,
    validation: (id: string) => ['admin', 'challenges', id, 'validation'] as const,
  },

  // Submissions
  submissions: {
    all: ['submissions'] as const,
    list: (params?: Record<string, unknown>) => ['submissions', 'list', params] as const,
    detail: (id: string) => ['submissions', 'detail', id] as const,
    testResults: (id: string) => ['submissions', id, 'test-results'] as const,
  },

  // Teams
  teams: {
    detail: (id: string) => ['teams', 'detail', id] as const,
    messages: (id: string) => ['teams', id, 'messages'] as const,
    progress: (id: string) => ['teams', id, 'progress'] as const,
    mentorAssigned: ['teams', 'mentor-assigned'] as const,
    tutorVisible: (params?: Record<string, unknown>) => ['teams', 'tutor-visible', params] as const,
    studentMine: (hackathonIds: string[]) => ['teams', 'student-mine', hackathonIds] as const,
  },

  // User search
  userSearch: (query: string) => ['users', 'search', query] as const,

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: (params?: Record<string, unknown>) => ['notifications', 'list', params] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },

  // Leaderboards
  leaderboards: {
    hackathon: (id: string) => ['leaderboards', 'hackathon', id] as const,
    sede: (id: string) => ['leaderboards', 'sede', id] as const,
    zone: ['leaderboards', 'zone'] as const,
  },

  // Gamification
  points: {
    score: ['points', 'score'] as const,
    history: (params?: Record<string, unknown>) => ['points', 'history', params] as const,
  },
  badges: {
    all: ['badges'] as const,
    mine: ['badges', 'mine'] as const,
  },

  // Profile
  profile: {
    me: ['profile', 'me'] as const,
  },

  // Sedes
  sedes: {
    all: ['sedes'] as const,
    detail: (id: string) => ['sedes', 'detail', id] as const,
    analytics: (id: string) => ['sedes', id, 'analytics'] as const,
    memberships: (id: string) => ['sedes', id, 'memberships'] as const,
  },

  // Admin zones
  zones: {
    all: ['zones'] as const,
    list: (params?: Record<string, unknown>) => ['zones', 'list', params] as const,
    detail: (id: string) => ['zones', 'detail', id] as const,
  },

  // Documents
  documents: {
    all: ['documents'] as const,
    collections: ['documents', 'collections'] as const,
    collectionDetail: (id: string) => ['documents', 'collections', id] as const,
    collectionDocs: (id: string) => ['documents', 'collections', id, 'documents'] as const,
    documentStatus: (id: string) => ['documents', 'status', id] as const,
    search: (collectionId: string, query: string) => ['documents', 'search', collectionId, query] as const,
  },

  // Research Groups
  research: {
    all: ['research'] as const,
    groups: ['research', 'groups'] as const,
    group: (id: string) => ['research', 'groups', id] as const,
    dashboard: (id: string) => ['research', 'groups', id, 'dashboard'] as const,
    members: (id: string) => ['research', 'groups', id, 'members'] as const,
    projects: (id: string) => ['research', 'groups', id, 'projects'] as const,
    tasks: (groupId: string, projectId: string) => ['research', 'groups', groupId, 'projects', projectId, 'tasks'] as const,
    challenges: (id: string) => ['research', 'groups', id, 'challenges'] as const,
    discussions: (id: string) => ['research', 'groups', id, 'discussions'] as const,
    messages: (groupId: string, threadId: string) => ['research', 'groups', groupId, 'discussions', threadId, 'messages'] as const,
  },

  // Admin
  admin: {
    users: (sedeId: string, params?: Record<string, unknown>) => ['admin', 'users', sedeId, params] as const,
    members: (sedeId: string) => ['admin', 'members', sedeId] as const,
    studentDetail: (userId: string) => ['admin', 'student', userId] as const,
    sedeConfig: (sedeId: string) => ['admin', 'sede-config', sedeId] as const,
    sedeDetail: (sedeId: string) => ['admin', 'sede', sedeId] as const,
    resourceRequests: ['admin', 'resource-requests'] as const,
    sedeOverview: (sedeId: string) => ['admin', 'sede-overview', sedeId] as const,
    health: ['admin', 'health'] as const,
    auditLog: (params?: Record<string, unknown>) => ['admin', 'audit-log', params] as const,
    challengeReviews: (params?: Record<string, unknown>) => ['admin', 'challenge-reviews', params] as const,
    aiKeys: ['admin', 'ai-keys'] as const,
  },

  // Analytics
  analytics: {
    global: ['analytics', 'global'] as const,
    sede: (id: string) => ['analytics', 'sede', id] as const,
    hackathon: (id: string) => ['analytics', 'hackathon', id] as const,
    student: (userId: string) => ['analytics', 'student', userId] as const,
  },

  // SuperAdmin
  superadmin: {
    overview: ['superadmin', 'overview'] as const,
    health: ['superadmin', 'health'] as const,
    zones: ['superadmin', 'zones'] as const,
    zoneDetail: (id: string) => ['superadmin', 'zones', id] as const,
    sedes: (params?: Record<string, unknown>) => ['superadmin', 'sedes', params] as const,
    resourceRequests: (params?: Record<string, unknown>) => ['superadmin', 'resource-requests', params] as const,
    auditLog: (params?: Record<string, unknown>) => ['superadmin', 'audit-log', params] as const,
  },

  // Grading
  grading: {
    all: ['grading'] as const,
    inbox: (params?: Record<string, unknown>) => ['grading', 'inbox', params] as const,
    submissions: (params?: Record<string, unknown>) => ['grading', 'submissions', params] as const,
    detail: (id: string) => ['grading', 'detail', id] as const,
    grade: (id: string) => ['grading', 'grade', id] as const,
  },
} as const;
