import apiClient from './client';
import { toArray } from './response-utils';
import type { GradeResult, Hackathon } from '@/types/api';

// ─── Types — aligned to the real OpenAPI contract ───────────────────────────

/**
 * GET /grading/inbox response.
 * Returns a per-challenge summary for a hackathon — NOT a flat submission list.
 * Use getGradingSubmissions() for the table rows.
 */
export interface GradingInboxChallengeSummary {
  challenge_id: string;
  challenge_title: string;
  pending_count: number;
  total_submissions: number;
}

export interface GradingInboxSummary {
  hackathon_id: string;
  total_pending: number;
  challenges: GradingInboxChallengeSummary[];
}

/**
 * GET /grading/submissions — flat row returned by the list endpoint.
 * Fields confirmed by OpenAPI: no student_name, no team_name, no rubric_json.
 */
export interface DocumentSubmissionRow {
  id: string;
  hackathon_id: string;
  challenge_id: string;
  user_global_id: string;
  team_id: string | null;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  status: 'pending' | 'under_review' | 'graded' | 'returned_for_revision';
  submitted_at: string;
  has_text_content: boolean;
}

export interface SubmissionListResponse {
  submissions: DocumentSubmissionRow[];
  total: number;
}

export interface GradingSubmissionsParams {
  hackathon_id: string;       // UUID — required by backend
  challenge_id?: string;      // UUID — optional filter
  status?: string;           // optional filter
  skip?: number;
  limit?: number;
}
/**
 * GET /grading/submissions/{submission_id} detail response.
 * Superset of list row — includes text_content.
 * student_name / team_name / rubric_json are NOT in this schema.
 */
export interface GradingSubmissionDetail {
  id: string;
  hackathon_id: string;
  challenge_id: string;
  user_global_id: string;
  team_id: string | null;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  status: string;
  submitted_at: string;
  has_text_content: boolean;
  text_content: string | null;
  file_url: string | null;
  // The backend detail may include these enriched fields — mark optional
  // since they are not guaranteed by the confirmed schema:
  student_name?: string | null;
  student_email?: string | null;
  team_name?: string | null;
  challenge_title?: string | null;
  challenge_description?: string | null;
  hackathon_name?: string | null;
  rubric_json?: import('@/types/api').RubricJson | null;
  existing_grade?: GradeResult | null;
}

/**
 * POST /grading/submissions/{submission_id}/grade body.
 * Confirmed shape from GradeRequest schema:
 *   rubric_scores: [{ criteria_name, score, max_score, comment }]
 *   overall_feedback: string
 *   ai_suggested_feedback?: string
 */
export interface GradeSubmissionPayload {
  rubric_scores: {
    criteria_name: string;
    score: number;
    max_score: number;
    comment: string;
  }[];
  overall_feedback: string;
  ai_suggested_feedback?: string;
}

/**
 * Real AIFeedbackResponse from POST /grading/submissions/{id}/request-ai-feedback
 * Confirmed schema from OpenAPI:
 *   submission_id: string
 *   suggested_scores: [{ criteria_name, suggested_score, suggested_comment }]
 *   suggested_feedback: string   ← overall feedback
 *   tokens_used: number
 *   provider_used: string
 */
export interface AIFeedbackResponse {
  submission_id: string;
  suggested_scores: {
    criteria_name: string;
    suggested_score: number;
    suggested_comment: string;
  }[];
  suggested_feedback: string;
  tokens_used: number;
  provider_used: string;
}

// ─── Hackathons for the grading context ─────────────────────────────────────

export async function getGradingHackathons(): Promise<Hackathon[]> {
  const { data } = await apiClient.get('/hackathons', {
    params: { limit: 100 },
  });
  return toArray<Hackathon>(data, ['items', 'results', 'hackathons']);
}

// ─── Inbox summary (cards / overview) ───────────────────────────────────────
// GET /grading/inbox?hackathon_id={uuid}
// Returns per-challenge summary — NOT rows for the table.

export async function getGradingInboxSummary(
  hackathonId: string,
): Promise<GradingInboxSummary> {
  const { data } = await apiClient.get('/grading/inbox', {
    params: { hackathon_id: hackathonId },
  });
  // Normalise in case the backend wraps the response
  return {
    hackathon_id: data?.hackathon_id ?? hackathonId,
    total_pending: data?.total_pending ?? 0,
    challenges: data?.challenges ?? [],
  };
}

// ─── Submissions list (table rows) ──────────────────────────────────────────
// GET /grading/submissions?hackathon_id={uuid}&...
// This is the correct source for the flat submission table.

export async function getGradingSubmissions(
  params: GradingSubmissionsParams,
): Promise<SubmissionListResponse> {
  const queryParams: Record<string, unknown> = {
    hackathon_id: params.hackathon_id,
    skip: params.skip ?? 0,
    limit: params.limit ?? 20,
  };
  if (params.status && params.status !== 'all') {
    queryParams.status = params.status;
  }
  if (params.challenge_id && params.challenge_id !== 'all') {
    queryParams.challenge_id = params.challenge_id;
  }

  const { data } = await apiClient.get('/grading/submissions', {
    params: queryParams,
  });

  const submissions: DocumentSubmissionRow[] =
    data?.submissions ?? data?.items ?? (Array.isArray(data) ? data : []);
  const total: number = data?.total ?? submissions.length;

  return { submissions, total };
}

// ─── Submission detail ───────────────────────────────────────────────────────
// GET /grading/submissions/{submission_id}

export async function getGradingSubmission(
  id: string,
): Promise<GradingSubmissionDetail> {
  const { data } = await apiClient.get(`/grading/submissions/${id}`);
  return data;
}

// ─── Grade submission ────────────────────────────────────────────────────────
// POST /grading/submissions/{submission_id}/grade

export async function gradeSubmission(
  submissionId: string,
  payload: GradeSubmissionPayload,
): Promise<GradeResult> {
  const { data } = await apiClient.post(
    `/grading/submissions/${submissionId}/grade`,
    payload,
  );
  return data;
}

// GET /grading/submissions/{submission_id}/grade

export async function getSubmissionGrade(
  submissionId: string,
): Promise<GradeResult | null> {
  try {
    const { data } = await apiClient.get(
      `/grading/submissions/${submissionId}/grade`,
    );
    return data;
  } catch {
    return null;
  }
}

// ─── AI feedback ─────────────────────────────────────────────────────────────
// POST /grading/submissions/{submission_id}/request-ai-feedback

export async function requestAIFeedback(
  submissionId: string,
): Promise<AIFeedbackResponse> {
  const { data } = await apiClient.post(
    `/grading/submissions/${submissionId}/request-ai-feedback`,
  );
  return data;
}

// ─── Return for revision ─────────────────────────────────────────────────────
// POST /grading/submissions/{submission_id}/return?feedback={text}
// feedback is a REQUIRED QUERY PARAM (min 5 chars), not a body field.

export async function returnForRevision(
  submissionId: string,
  feedback: string,
): Promise<void> {
  await apiClient.post(
    `/grading/submissions/${submissionId}/return`,
    null,
    { params: { feedback } },
  );
}

// ─── Challenge template (rubric) ─────────────────────────────────────────────
// GET /challenges/{challenge_id}/template
// rubric_json lives here, NOT in the submission list or detail.
// Use this when the grading form needs the rubric for a specific challenge.

export async function getChallengeTemplate(
  challengeId: string,
): Promise<import('@/types/api').RubricJson | null> {
  try {
    const { data } = await apiClient.get(
      `/challenges/${challengeId}/template`,
    );
    // The template response shape: { rubric_json: {...} } or the rubric directly
    return data?.rubric_json ?? data ?? null;
  } catch {
    return null;
  }
}
