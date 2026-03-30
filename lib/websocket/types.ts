// ─── Connection States ──────────────────────────────────────────────────────

export type ConnectionState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING' | 'DISCONNECTED';

// ─── Client Options ─────────────────────────────────────────────────────────

export interface WSClientOptions {
  reconnect?: boolean;
  maxRetries?: number;
  initialBackoff?: number;
  maxBackoff?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
}

export const DEFAULT_WS_OPTIONS: Required<WSClientOptions> = {
  reconnect: true,
  maxRetries: 10,
  initialBackoff: 1000,
  maxBackoff: 30000,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
};

// ─── Message Envelope ───────────────────────────────────────────────────────

export interface WSMessage<T = unknown> {
  type: string;
  payload: T;
  event_id?: string;
  timestamp?: string;
}

// ─── Hackathon Live Events ──────────────────────────────────────────────────

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  score: number;
  rank: number;
  challenges_solved: number;
  last_submission_at?: string;
}

export interface LeaderboardUpdatePayload {
  entries: LeaderboardEntry[];
  my_rank?: number;
  total_participants: number;
}

export interface FlashChallengePayload {
  hackathon_id: string;
  challenge_id: string;
  title: string;
  duration_minutes: number;
  multiplier: number;
  starts_at: string;
}

export interface HackathonStatusPayload {
  hackathon_id: string;
  status: string;
  message?: string;
}

export interface SubmissionResultPayload {
  submission_id: string;
  challenge_id: string;
  status: string;
  score?: number;
  passed_tests?: number;
  total_tests?: number;
  points_earned?: number;
  new_badges?: { name: string; description: string; icon?: string }[];
}

// ─── Hackathon Monitor Events (Admin) ───────────────────────────────────────

export interface MonitorStatsPayload {
  active_participants: number;
  total_submissions: number;
  submissions_per_minute: number;
  hint_usage: number;
  ai_queries: number;
  flagged_submissions: number;
  avg_score: number;
}

export interface MonitorAlertPayload {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  user_id?: string;
  user_name?: string;
  timestamp: string;
}

// ─── Team Chat Events ───────────────────────────────────────────────────────

export interface ChatMessagePayload {
  id: string;
  team_id: string;
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
  content: string;
  message_type?: 'text' | 'code' | 'system';
  created_at: string;
}

export interface TypingPayload {
  user_id: string;
  user_name: string;
  is_typing: boolean;
}

// ─── Notification Events ────────────────────────────────────────────────────

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, unknown>;
  created_at: string;
}

// ─── Event Map (for type-safe listeners) ────────────────────────────────────

export interface WSEventMap {
  // Connection lifecycle
  connected: undefined;
  disconnected: { reason?: string };
  reconnecting: { attempt: number; delay: number };
  error: { message: string };

  // Hackathon Live
  leaderboard_update: LeaderboardUpdatePayload;
  flash_challenge_start: FlashChallengePayload;
  flash_challenge_end: { challenge_id: string };
  hackathon_status_change: HackathonStatusPayload;
  hackathon_paused: HackathonStatusPayload;
  hackathon_resumed: HackathonStatusPayload;
  submission_result: SubmissionResultPayload;

  // Monitor
  monitor_stats: MonitorStatsPayload;
  monitor_alert: MonitorAlertPayload;

  // Chat
  chat_message: ChatMessagePayload;
  typing: TypingPayload;

  // Notifications
  notification: NotificationPayload;

  // Generic
  pong: undefined;
  [key: string]: unknown;
}
