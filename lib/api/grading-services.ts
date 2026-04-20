import apiClient from './client';
import { toListResult } from './response-utils';
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
  // --- MOCK DATA PARA AUDITORÍA UX ---
  const mockItems: GradingInboxItem[] = [
    {
      id: 'sub-1', submission_id: 'sub-1',
      student_name: 'Ana García', student_email: 'ana@example.com', team_name: 'Equipo Alpha',
      challenge_id: 'c-1', challenge_title: 'Desarrollo de API REST',
      hackathon_id: 'h-1', hackathon_name: 'Hackathon Primavera 2026',
      submitted_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      status: 'pending',
      file_type: 'application/pdf', file_url: null, text_content: null,
      original_filename: 'entrega_final.pdf', file_size_bytes: 102400,
      rubric_json: null
    },
    {
      id: 'sub-2', submission_id: 'sub-2',
      student_name: 'Carlos López', student_email: 'carlos@example.com', team_name: 'Code Ninjas',
      challenge_id: 'c-2', challenge_title: 'Implementación de OAuth2',
      hackathon_id: 'h-1', hackathon_name: 'Hackathon Primavera 2026',
      submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      status: 'under_review',
      file_type: 'application/zip', file_url: null, text_content: null,
      original_filename: 'source_code.zip', file_size_bytes: 512000,
      rubric_json: null
    },
    {
      id: 'sub-3', submission_id: 'sub-3',
      student_name: 'María Fernández', student_email: 'maria@example.com', team_name: null,
      challenge_id: 'c-3', challenge_title: 'Diseño de Base de Datos',
      hackathon_id: 'h-2', hackathon_name: 'Hackathon Invierno 2025',
      submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      status: 'returned_for_revision',
      file_type: 'application/pdf', file_url: null, text_content: null,
      original_filename: 'diagrama_er.pdf', file_size_bytes: 204800,
      rubric_json: null
    },
    {
      id: 'sub-4', submission_id: 'sub-4',
      student_name: 'Juan Pérez', student_email: 'juan@example.com', team_name: 'Los Hackers',
      challenge_id: 'c-1', challenge_title: 'Desarrollo de API REST',
      hackathon_id: 'h-1', hackathon_name: 'Hackathon Primavera 2026',
      submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      status: 'graded',
      file_type: 'application/json', file_url: null, text_content: null,
      original_filename: 'postman_collection.json', file_size_bytes: 15360,
      rubric_json: null
    },
    {
      id: 'sub-5', submission_id: 'sub-5',
      student_name: 'Lucía Gómez', student_email: 'lucia@example.com', team_name: 'Dev Squad',
      challenge_id: 'c-4', challenge_title: 'Optimización de Algoritmos',
      hackathon_id: 'h-1', hackathon_name: 'Hackathon Primavera 2026',
      submitted_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      status: 'pending',
      file_type: 'text/plain', file_url: null, text_content: null,
      original_filename: 'solucion.py', file_size_bytes: 5120,
      rubric_json: null
    },
    {
      id: 'sub-6', submission_id: 'sub-6',
      student_name: 'Roberto Sánchez', student_email: 'roberto@example.com', team_name: 'Frontend Masters',
      challenge_id: 'c-5', challenge_title: 'Maquetado Responsivo',
      hackathon_id: 'h-1', hackathon_name: 'Hackathon Primavera 2026',
      submitted_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      status: 'pending',
      file_type: 'application/zip', file_url: null, text_content: null,
      original_filename: 'build.zip', file_size_bytes: 1024000,
      rubric_json: null
    }
  ];

  let filteredItems = [...mockItems];
  if (params?.status && params.status !== 'all') {
    filteredItems = filteredItems.filter(i => i.status === params.status);
  }
  if (params?.hackathon_id && params.hackathon_id !== 'all') {
    filteredItems = filteredItems.filter(i => i.hackathon_id === params.hackathon_id);
  }
  if (params?.challenge_id && params.challenge_id !== 'all') {
    filteredItems = filteredItems.filter(i => i.challenge_id === params.challenge_id);
  }

  const counts = {
    pending: mockItems.filter(i => i.status === 'pending').length,
    under_review: mockItems.filter(i => i.status === 'under_review').length,
    graded: mockItems.filter(i => i.status === 'graded').length,
  };

  return {
    items: filteredItems,
    total: filteredItems.length,
    counts,
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
