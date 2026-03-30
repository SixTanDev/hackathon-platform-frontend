import apiClient from './client';
import type { GradeResult, RubricJson } from '@/types/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GradingInboxItem {
  id: string;
  submission_id: string;
  student_name: string;
  student_email: string;
  team_name: string | null;
  challenge_id: string;
  challenge_title: string;
  hackathon_id: string;
  hackathon_name: string;
  submitted_at: string;
  status: 'pending' | 'under_review' | 'graded' | 'returned_for_revision';
  file_type: string;
  file_url: string | null;
  text_content: string | null;
  original_filename: string;
  file_size_bytes: number;
  rubric_json: RubricJson | null;
}

export interface GradingInboxResponse {
  items: GradingInboxItem[];
  total: number;
  counts: {
    pending: number;
    under_review: number;
    graded: number;
  };
}

export interface GradingInboxParams {
  hackathon_id?: string;
  challenge_id?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

export interface GradeSubmissionPayload {
  criteria_results: {
    criterion_id: string;
    score: number;
    comment: string;
  }[];
  overall_feedback: string;
  is_draft?: boolean;
}

export interface BulkGradePayload {
  submission_ids: string[];
  criteria_results: {
    criterion_id: string;
    score: number;
    comment: string;
  }[];
  overall_feedback: string;
}

export interface AIFeedbackResponse {
  overall_feedback: string;
  criteria_feedback: {
    criterion_id: string;
    suggested_score: number;
    suggested_comment: string;
  }[];
  status: string;
}

export interface GradingSubmissionDetail {
  id: string;
  submission_id: string;
  student_name: string;
  student_email: string;
  team_name: string | null;
  challenge_id: string;
  challenge_title: string;
  challenge_description: string;
  hackathon_id: string;
  hackathon_name: string;
  submitted_at: string;
  status: string;
  file_type: string;
  file_url: string | null;
  text_content: string | null;
  original_filename: string;
  file_size_bytes: number;
  rubric_json: RubricJson | null;
  existing_grade: GradeResult | null;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export async function getGradingInbox(params?: GradingInboxParams): Promise<GradingInboxResponse> {
  const res = await apiClient.get('/grading/inbox', { params });
  const data = res.data;
  // Normalize response shape
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      counts: {
        pending: data.filter((i: GradingInboxItem) => i.status === 'pending').length,
        under_review: data.filter((i: GradingInboxItem) => i.status === 'under_review').length,
        graded: data.filter((i: GradingInboxItem) => i.status === 'graded').length,
      },
    };
  }
  return {
    items: data.items ?? data.submissions ?? [],
    total: data.total ?? 0,
    counts: data.counts ?? { pending: 0, under_review: 0, graded: 0 },
  };
}

export async function getGradingSubmission(id: string): Promise<GradingSubmissionDetail> {
  const res = await apiClient.get(`/grading/submissions/${id}`);
  return res.data;
}

export async function gradeSubmission(submissionId: string, payload: GradeSubmissionPayload): Promise<GradeResult> {
  const res = await apiClient.post(`/grading/submissions/${submissionId}/grade`, payload);
  return res.data;
}

export async function getSubmissionGrade(submissionId: string): Promise<GradeResult | null> {
  try {
    const res = await apiClient.get(`/grading/submissions/${submissionId}/grade`);
    return res.data;
  } catch {
    return null;
  }
}

export async function requestAIFeedback(submissionId: string): Promise<AIFeedbackResponse> {
  const res = await apiClient.post(`/grading/submissions/${submissionId}/request-ai-feedback`);
  return res.data;
}

export async function returnForRevision(submissionId: string, reason: string): Promise<void> {
  await apiClient.post(`/grading/submissions/${submissionId}/return`, { reason });
}

export async function bulkGrade(payload: BulkGradePayload): Promise<{ graded: number; errors: string[] }> {
  const res = await apiClient.post('/grading/bulk-grade', payload);
  return res.data;
}
