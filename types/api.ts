// ─── Enums & Constants ─────────────────────────────────────────────────────

export type RoleName = 'admin' | 'tutor' | 'director_semillero' | 'student' | 'guest';

export type HackathonStatus = 'draft' | 'registration_open' | 'registration_closed' | 'live' | 'paused' | 'finished';
export type HackathonMode = 'live' | 'practice';
export type HackathonScope = 'global' | 'regional' | 'local';
export type HackathonRegistrationStatus = 'registered' | 'confirmed' | 'cancelled';

export type ChallengeType = 'coding' | 'case_study' | 'essay' | 'clinical_analysis' | 'legal_argument' | 'design_proposal' | 'custom';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ChallengeStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';
export type ChallengeSource = 'manual' | 'ai_generated' | 'imported';
export type AIGenerationStatus = 'pending' | 'generated' | 'under_review' | 'approved' | 'rejected';
export type EvaluationType = 'auto' | 'manual' | 'hybrid';

export type SubmissionStatus = 'queued' | 'running' | 'passed' | 'partial' | 'failed' | 'error' | 'timeout';
export type SubmissionFormat = 'pdf' | 'text' | 'code' | 'mixed';
export type TestRunStatus = 'passed' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error' | 'compilation_error';
export type DocumentSubmissionStatus = 'submitted' | 'under_review' | 'graded' | 'returned_for_revision';

export type TeamStatus = 'forming' | 'ready' | 'active' | 'disbanded';
export type TeamMemberRole = 'leader' | 'member';
export type TeamMembershipStatus = 'invited' | 'accepted' | 'declined' | 'removed';

export type BadgeCriteriaType = 'automatic' | 'manual_nomination';
export type BadgeAwardedBy = 'system' | 'mentor';
export type PointReason = 'challenge_solved' | 'first_blood_bonus' | 'streak_bonus' | 'hint_penalty' | 'flash_challenge' | 'manual_adjustment';

export type NotificationType =
  | 'hackathon_start' | 'hackathon_paused' | 'hackathon_finished'
  | 'badge_earned' | 'team_invite' | 'team_member_joined'
  | 'submission_graded' | 'impersonation_ended' | 'flash_challenge'
  | 'system_alert' | 'leaderboard_updated' | 'challenge_review_pending'
  | 'ai_generation_completed' | 'submission_result'
  | 'hackathon_end' | 'hint_available';

export type DocumentProcessingStatus = 'uploaded' | 'processing' | 'ready' | 'error';
export type DocumentFileType = 'pdf' | 'docx' | 'txt' | 'md';
export type CollectionOwnerType = 'sede' | 'research_group' | 'hackathon';
export type FlashChallengeStatus = 'scheduled' | 'active' | 'finished';
export type TabVisibilityEvent = 'blur' | 'focus';
export type ResourceRequestStatus = 'pending' | 'approved' | 'rejected';

// ─── User ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_superadmin: boolean;
}

export interface GlobalUser extends User {
  is_active: boolean;
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  avatar_url?: string | null;
}

export interface UserProfile {
  id: string;
  user_global_id: string;
  sede_id: string;
  bio: string | null;
  preferences_json: Record<string, unknown> | null;
}

export interface UserProfileUpdate {
  bio?: string | null;
  preferences_json?: Record<string, unknown> | null;
}

export interface ChallengeBreakdown {
  category: string;
  count: number;
}

export interface ProfileResponse {
  user_global_id: string;
  sede_id: string;
  total_points: number;
  current_streak_days: number;
  longest_streak_days: number;
  sede_rank: number | null;
  badges: BadgeResponse[];
  badge_count: number;
  hackathons_participated: number;
  challenges_solved: number;
  challenges_by_category: ChallengeBreakdown[];
  recent_transactions: PointTransaction[];
}

export interface BadgeResponse {
  badge_id: string;
  badge_name: string;
  awarded_at: string;
}

// ─── Zone ──────────────────────────────────────────────────────────────────

export interface Zone {
  id: string;
  code: string;
  name: string;
  db_host: string;
  db_name: string;
  is_active: boolean;
  created_at: string;
}

export interface ZoneCreate {
  name: string;
  slug: string;
}

export interface ZoneUpdate {
  name?: string | null;
}

export interface ZoneStats {
  sede_count: number;
  user_count: number;
  hackathon_count: number;
}

export interface ZoneWithStats extends Zone {
  stats: ZoneStats | null;
}

// ─── Sede ──────────────────────────────────────────────────────────────────

export interface Sede {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  is_active: boolean;
  config_json: Record<string, unknown> | null;
}

export interface SedeCreate {
  name: string;
  slug: string;
  description?: string | null;
  city?: string | null;
  config_json?: Record<string, unknown> | null;
}

export interface SedeUpdate {
  name?: string | null;
  description?: string | null;
  city?: string | null;
  config_json?: Record<string, unknown> | null;
}

export interface SedeAnalytics {
  sede_id: string;
  total_active_members: number;
  members_by_role: Record<string, number>;
  hackathons_total: number;
  hackathons_draft: number;
  hackathons_active: number;
  hackathons_finished: number;
  hackathons_scheduled: number;
  challenges_total: number;
  challenges_approved: number;
  challenges_by_difficulty: Record<string, number>;
  ai_interactions_total: number;
  ai_interactions_avg_per_student: number;
  submissions_total: number;
  submissions_passed: number;
  submissions_pass_rate: number;
}

// ─── Sede Membership ───────────────────────────────────────────────────────

export interface SedeMembership {
  id: string;
  user_global_id: string;
  sede_id: string;
  role: RoleName;
  is_active: boolean;
  joined_at: string;
}

export interface MembershipAssign {
  user_global_id: string;
  role: RoleName;
}

export interface MembershipUpdate {
  role: RoleName;
}

export interface ZoneMembershipInfo {
  zone_id: string;
  zone_code: string;
  zone_name: string;
  sedes: SedeMembershipInfo[];
}

export interface SedeMembershipInfo {
  sede_id: string;
  sede_name: string;
  sede_slug: string;
  role: RoleName;
}

// ─── Hackathon ─────────────────────────────────────────────────────────────

export interface Hackathon {
  id: string;
  name: string;
  description: string | null;
  rules_text: string | null;
  scope: HackathonScope;
  mode: HackathonMode;
  status: HackathonStatus;
  owner_campus_id: string | null;
  created_by_user_id: string;
  starts_at: string | null;
  ends_at: string | null;
  registration_starts_at: string | null;
  registration_ends_at: string | null;
  is_team_based: boolean;
  allow_individual: boolean;
  min_team_size: number | null;
  max_team_size: number;
  hint_penalty_percent: number;
  config_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface HackathonCreate {
  name: string;
  scope: HackathonScope;
  description?: string | null;
  rules_text?: string | null;
  mode?: HackathonMode;
  starts_at?: string | null;
  ends_at?: string | null;
  registration_starts_at?: string | null;
  registration_ends_at?: string | null;
  is_team_based?: boolean;
  allow_individual?: boolean;
  min_team_size?: number | null;
  max_team_size?: number;
  hint_penalty_percent?: number;
  config_json?: Record<string, unknown> | null;
}

export interface HackathonUpdate {
  name?: string | null;
  description?: string | null;
  rules_text?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  registration_starts_at?: string | null;
  registration_ends_at?: string | null;
  is_team_based?: boolean | null;
  allow_individual?: boolean | null;
  min_team_size?: number | null;
  max_team_size?: number | null;
  hint_penalty_percent?: number | null;
  config_json?: Record<string, unknown> | null;
}

export interface HackathonStatusTransition {
  status: HackathonStatus;
}

export interface HackathonChallenge {
  id: string;
  hackathon_id: string;
  challenge_id: string;
  order_index: number;
  points_override: number | null;
  is_flash: boolean;
  flash_ends_at: string | null;
  flash_multiplier: number;
  created_at: string;
}

// ─── Registration ──────────────────────────────────────────────────────────

export interface Registration {
  id: string;
  hackathon_id: string;
  user_global_id: string;
  sede_id: string;
  team_id: string | null;
  registered_at: string;
  status: HackathonRegistrationStatus;
}

export interface RegistrationCreate {
  team_id?: string | null;
}

// ─── Challenge ─────────────────────────────────────────────────────────────

export interface ChallengeMetadata {
  tags?: string[];
  prerequisites?: string[];
  estimated_time_minutes?: number | null;
  topic?: string | null;
}

export interface Challenge {
  id: string;
  title: string;
  description_markdown: string;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  category: string | null;
  points_base: number;
  time_limit_seconds: number;
  memory_limit_mb: number;
  allowed_languages: string[];
  is_public: boolean;
  source: ChallengeSource;
  status: ChallengeStatus;
  ai_generation_status: AIGenerationStatus | null;
  sede_id: string | null;
  library_id: string | null;
  created_by_user_id: string | null;
  approved_by_user_id: string | null;
  metadata_json: ChallengeMetadata | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengePublic {
  id: string;
  title: string;
  description_markdown: string;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  category: string | null;
  points_base: number;
  time_limit_seconds: number;
  memory_limit_mb: number;
  allowed_languages: string[];
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface ChallengeListItem {
  id: string;
  title: string;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  category: string | null;
  points_base: number;
  status: ChallengeStatus;
  is_public: boolean;
  source: ChallengeSource;
  created_at: string;
}

export interface ChallengeCreate {
  title: string;
  description_markdown: string;
  type?: ChallengeType;
  difficulty?: ChallengeDifficulty;
  category?: string | null;
  points_base?: number | null;
  time_limit_seconds?: number;
  memory_limit_mb?: number;
  allowed_languages?: string[];
  is_public?: boolean;
  library_id?: string | null;
  metadata_json?: ChallengeMetadata | null;
  test_cases?: TestCaseCreate[];
}

export interface ChallengeUpdate {
  title?: string | null;
  description_markdown?: string | null;
  type?: ChallengeType | null;
  difficulty?: ChallengeDifficulty | null;
  category?: string | null;
  points_base?: number | null;
  time_limit_seconds?: number | null;
  memory_limit_mb?: number | null;
  allowed_languages?: string[] | null;
  is_public?: boolean | null;
  metadata_json?: ChallengeMetadata | null;
}

// ─── Test Case ─────────────────────────────────────────────────────────────

export interface TestCase {
  id: string;
  input_data: string;
  expected_output: string;
  is_hidden: boolean;
  is_example: boolean;
  points_weight: number;
  order_index: number;
  explanation: string | null;
  created_at: string;
}

export interface TestCasePublic {
  id: string;
  input_data: string;
  expected_output: string | null;
  is_example: boolean;
  order_index: number;
  explanation: string | null;
}

export interface TestCaseCreate {
  input_data: string;
  expected_output: string;
  is_hidden?: boolean;
  is_example?: boolean;
  points_weight?: number;
  order_index?: number;
  explanation?: string | null;
}

export interface TestCaseUpdate {
  input_data?: string | null;
  expected_output?: string | null;
  is_hidden?: boolean | null;
  is_example?: boolean | null;
  points_weight?: number | null;
  order_index?: number | null;
  explanation?: string | null;
}

// ─── Submission ────────────────────────────────────────────────────────────

export interface Submission {
  id: string;
  challenge_id: string;
  hackathon_id: string | null;
  user_id: string | null;
  team_id: string | null;
  language: string;
  status: SubmissionStatus;
  is_run: boolean;
  passed_tests: number | null;
  total_tests: number | null;
  max_score: number | null;
  final_score: number | null;
  hints_used: number;
  hint_penalty_applied: number;
  execution_time_ms: number | null;
  memory_used_mb: number | null;
  stderr: string | null;
  evaluated_at: string | null;
  celery_task_id: string | null;
  created_at: string;
}

export interface SubmissionDetail extends Submission {
  test_results: SubmissionTestResult[];
}

export interface SubmissionCreate {
  challenge_id: string;
  source_code: string;
  language: string;
  hackathon_id?: string | null;
  team_id?: string | null;
  hints_used?: number;
}

export interface SubmissionTestResult {
  id: string;
  test_case_id: string;
  passed: boolean;
  status: TestRunStatus;
  execution_time_ms: number;
  memory_used_mb: number;
  stdout: string | null;
  stderr: string | null;
}

export interface DocumentSubmission {
  id: string;
  hackathon_id: string;
  challenge_id: string;
  user_global_id: string;
  team_id: string | null;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  status: DocumentSubmissionStatus;
  submitted_at: string;
  has_text_content: boolean;
}

// ─── Rubric & Grading ───────────────────────────────────────────────────────

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  max_points: number;
  scoring_levels?: { label: string; points: number; description: string }[];
}

export interface RubricJson {
  criteria: RubricCriterion[];
  total_points: number;
}

export interface GradeCriterionResult {
  criterion_id: string;
  criterion_name: string;
  score: number;
  max_score: number;
  comment: string | null;
}

export interface GradeResult {
  submission_id: string;
  total_score: number;
  max_score: number;
  overall_feedback: string | null;
  criteria_results: GradeCriterionResult[];
  graded_by_user_id: string | null;
  graded_at: string | null;
}

// ─── Team ──────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  user_global_id: string;
  role: TeamMemberRole;
  status: TeamMembershipStatus;
  joined_at: string | null;
}

export interface Team {
  id: string;
  hackathon_id: string;
  campus_id: string;
  name: string;
  created_by_user_id: string;
  status: TeamStatus;
  max_size: number;
  invite_code: string | null;
  created_at: string;
  members: TeamMember[];
}

export interface TeamCreate {
  name: string;
}

export interface TeamListResponse {
  teams: Team[];
  total: number;
}

// ─── Hint ──────────────────────────────────────────────────────────────────

export interface HintRequest {
  hackathon_id: string;
  hint_level: number;
  student_message: string;
  student_code?: string | null;
}

export interface HintResponse {
  hint_text: string;
  hint_level: number;
  hints_remaining: number;
  next_available_at: string | null;
  penalty_info: string;
  provider_used: string;
  tokens_used: number;
}

// ─── Badge & Gamification ──────────────────────────────────────────────────

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url: string | null;
  criteria_type: BadgeCriteriaType;
  criteria_json: Record<string, unknown>;
}

export interface BadgeSummary {
  badge_id: string;
  badge_name: string;
  awarded_at: string;
}

export interface UserBadge {
  id: string;
  user_global_id: string;
  badge_id: string;
  hackathon_id: string | null;
  awarded_at: string;
  awarded_by: BadgeAwardedBy;
  nominator_user_id: string | null;
}

export interface UserScore {
  user_global_id: string;
  sede_id: string;
  total_points: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string | null;
}

export interface PointTransaction {
  id: string;
  user_global_id: string;
  sede_id: string;
  hackathon_id: string | null;
  points: number;
  reason: PointReason;
  reference_id: string | null;
  created_at: string;
}

export interface ManualPointAdjustment {
  user_global_id: string;
  points: number;
  reason_note: string;
  hackathon_id?: string | null;
}

// ─── Notification ──────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_global_id: string;
  sede_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkNotificationsReadRequest {
  notification_ids: string[];
}

// ─── Leaderboard ───────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  user_global_id: string | null;
  team_id: string | null;
  display_name: string;
  score: number;
  submissions_passed: number;
  hints_used: number;
}

export interface LeaderboardEntryResponse {
  rank: number;
  member_id: string;
  score: number;
  badge_count: number;
  streak: number;
}

export interface LeaderboardResponse {
  scope: string;
  scope_id: string | null;
  type: string;
  entries: LeaderboardEntryResponse[];
  page: number;
  limit: number;
  total: number;
}

export interface Leaderboard {
  hackathon_id: string;
  type: string;
  entries: LeaderboardEntry[];
  computed_at: string;
}

// ─── Flash Challenge ───────────────────────────────────────────────────────

export interface FlashChallenge {
  id: string;
  hackathon_id: string;
  challenge_id: string;
  points_multiplier: number;
  starts_at: string;
  duration_minutes: number;
  status: FlashChallengeStatus;
  created_by_user_id: string;
  created_at: string;
}

// ─── Tab Visibility (Proctoring) ───────────────────────────────────────────

export interface TabEventCreate {
  event: TabVisibilityEvent;
  timestamp: string;
}

export interface TabEventRead {
  id: string;
  hackathon_id: string;
  user_global_id: string;
  sede_id: string | null;
  event_type: TabVisibilityEvent;
  event_timestamp: string;
  created_at: string;
}

// ─── Document Collection ───────────────────────────────────────────────────

export interface DocumentCollection {
  id: string;
  sede_id: string;
  name: string;
  description: string | null;
  owner_type: CollectionOwnerType;
  owner_id: string;
  created_by_user_id: string;
  created_at: string;
  document_count: number;
}

export interface DocumentCollectionCreate {
  name: string;
  description?: string | null;
  owner_type: CollectionOwnerType;
  owner_id: string;
}

export interface DocumentCollectionUpdate {
  name?: string | null;
  description?: string | null;
}

export interface DocumentItem {
  id: string;
  collection_id: string;
  filename: string;
  original_filename: string;
  file_type: DocumentFileType;
  file_size_bytes: number;
  processing_status: DocumentProcessingStatus;
  processing_error?: string | null;
  chunk_count: number;
  created_by_user_id: string;
  created_at: string;
}

export interface DocumentSource {
  document_id: string;
  title: string;
  page_number: number | null;
  section_title: string | null;
  excerpt: string;
}

export interface DocumentListResponse {
  documents: DocumentItem[];
  total: number;
}

export interface CollectionListResponse {
  collections: DocumentCollection[];
  total: number;
}

// ─── Document Q&A (RAG) ────────────────────────────────────────────────────

export interface AskDocumentsRequest {
  question: string;
  collection_ids?: string[];
  hackathon_id?: string;
  max_sources?: number;
}

export interface AskDocumentsResponse {
  answer: string;
  sources: DocumentSource[];
  queries_remaining: number | null;
  tokens_used: number;
}

// ─── AI Usage ──────────────────────────────────────────────────────────────

export interface StudentUsageStats {
  user_global_id: string;
  total_interactions: number;
  total_hints: number;
  total_rag_queries: number;
  total_tokens: number;
  hints_by_challenge: Record<string, number>;
  excessive_usage: boolean;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_minutes: number;
}

export interface ContextSelectionRequest {
  zone_id: string;
  sede_id: string;
}

export interface ContextTokenResponse {
  context_token: string;
  token_type: string;
  zone_id: string;
  zone_slug: string;
  sede_id: string;
  role: RoleName;
  expires_in_minutes: number;
}

export interface RefreshRequest {
  refresh_token: string;
}

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// ─── Error ─────────────────────────────────────────────────────────────────

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationError[];
}

export interface ApiError {
  message: string;
  detail: string;
  error_code?: string;
  field_errors?: ValidationError[];
  status?: number;
  config?: {
    method?: string;
    url?: string;
  };
  response?: {
    status?: number;
    data?: unknown;
  };
}
