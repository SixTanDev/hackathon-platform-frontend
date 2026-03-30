import apiClient from './client';
import { toArray, toListResult } from './response-utils';
import type {
  Challenge,
  ChallengeCreate,
  ChallengeUpdate,
  ChallengeType,
  ChallengeDifficulty,
  ChallengeSource,
  ChallengeStatus,
  TestCase,
  TestCaseCreate,
  TestCaseUpdate,
} from '@/types/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChallengeListParams {
  skip?: number;
  limit?: number;
  type?: ChallengeType;
  difficulty?: ChallengeDifficulty;
  source?: ChallengeSource;
  status?: ChallengeStatus;
  category?: string;
  search?: string;
  is_public?: boolean;
}

export interface ChallengeSolution {
  id: string;
  challenge_id: string;
  source_code: string;
  language: string;
  time_complexity?: string | null;
  space_complexity?: string | null;
  created_at: string;
}

export interface ValidationResult {
  passed: boolean;
  total_tests: number;
  passed_tests: number;
  results: {
    test_case_id: string;
    order_index: number;
    passed: boolean;
    expected_output: string;
    actual_output: string | null;
    execution_time_ms: number;
    error: string | null;
  }[];
}

export interface SimilarChallenge {
  id: string;
  title: string;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  category: string | null;
  similarity_score: number;
}

/** POST /challenges/ai-generate request body */
export interface AIGenerateRequest {
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  topic: string;
  additional_instructions?: string;
  document_collection_id?: string;
}

/** Response from POST /challenges/ai-generate */
export interface AIGenerateResponse {
  challenge?: Challenge;
  challenge_id?: string;
  status: string;
  message?: string;
}

/** Review entry from GET /admin/challenge-reviews */
export interface ChallengeReview {
  id: string;
  challenge_id?: string;
  challenge_name?: string;
  challenge?: Challenge;
  validation_results?: ValidationResult | null;
  similar_challenges?: SimilarChallenge[];
  requested_at?: string;
  reviewed_at?: string | null;
  reviewer_id?: string | null;
  status: string; // pending | approved | rejected
  rejection_reason?: string | null;
  generation_request_id?: string;
  [k: string]: unknown;
}

// ─── Challenge CRUD ─────────────────────────────────────────────────────────

export async function listChallenges(params?: ChallengeListParams): Promise<{ items: Challenge[]; total: number }> {
  const res = await apiClient.get('/challenges', { params });
  return toListResult<Challenge>(res.data, {
    arrayKeys: ['items', 'results', 'challenges'],
    totalKeys: ['total', 'count'],
  });
}

export async function getChallenge(id: string): Promise<Challenge> {
  const res = await apiClient.get(`/challenges/${id}`);
  return res.data;
}

export async function createChallenge(payload: ChallengeCreate): Promise<Challenge> {
  const res = await apiClient.post('/challenges', payload);
  return res.data;
}

export async function updateChallenge(id: string, payload: ChallengeUpdate): Promise<Challenge> {
  const res = await apiClient.put(`/challenges/${id}`, payload);
  return res.data;
}

export async function deleteChallenge(id: string): Promise<void> {
  await apiClient.delete(`/challenges/${id}`);
}

// ─── Test Cases ─────────────────────────────────────────────────────────────

export async function listTestCases(challengeId: string): Promise<TestCase[]> {
  const res = await apiClient.get(`/challenges/${challengeId}/test-cases`);
  return toArray<TestCase>(res.data, ['items', 'test_cases', 'results']);
}

export async function addTestCase(challengeId: string, payload: TestCaseCreate): Promise<TestCase> {
  const res = await apiClient.post(`/challenges/${challengeId}/test-cases`, payload);
  return res.data;
}

export async function updateTestCase(challengeId: string, tcId: string, payload: TestCaseUpdate): Promise<TestCase> {
  const res = await apiClient.put(`/challenges/${challengeId}/test-cases/${tcId}`, payload);
  return res.data;
}

export async function deleteTestCase(challengeId: string, tcId: string): Promise<void> {
  await apiClient.delete(`/challenges/${challengeId}/test-cases/${tcId}`);
}

// ─── Solution & Validation ──────────────────────────────────────────────────

export async function submitSolution(challengeId: string, payload: { source_code: string; language: string; time_complexity?: string; space_complexity?: string }): Promise<ChallengeSolution> {
  const res = await apiClient.post(`/challenges/${challengeId}/solution`, payload);
  return res.data;
}

export async function getSolution(challengeId: string): Promise<ChallengeSolution | null> {
  try {
    const res = await apiClient.get(`/challenges/${challengeId}/solution`);
    return res.data;
  } catch {
    return null;
  }
}

export async function validateChallenge(challengeId: string): Promise<ValidationResult> {
  const res = await apiClient.post(`/challenges/${challengeId}/validate`);
  return res.data;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function getTemplate(challengeId: string): Promise<{ language: string; code: string } | null> {
  try {
    const res = await apiClient.get(`/challenges/${challengeId}/template`);
    return res.data;
  } catch {
    return null;
  }
}

export async function createTemplate(challengeId: string, payload: { language: string; code: string }): Promise<void> {
  await apiClient.post(`/challenges/${challengeId}/template`, payload);
}

// ─── Similar / Duplicate Detection ──────────────────────────────────────────

export async function findSimilarChallenges(challengeId: string): Promise<SimilarChallenge[]> {
  const res = await apiClient.get(`/challenges/${challengeId}/similar`);
  return toArray<SimilarChallenge>(res.data, ['items', 'results']);
}

export async function searchSimilarByText(title: string, category?: string): Promise<SimilarChallenge[]> {
  const res = await apiClient.get('/challenges', { params: { search: title, category, limit: 10 } }).catch(() => ({ data: [] }));
  const items = toArray<Record<string, unknown>>(res.data, ['items', 'results']);
  return items.map((c: any) => ({ id: c.id, title: c.title, type: c.type, difficulty: c.difficulty, similarity_score: 0, category: c.category }));
}

// ─── Approve / Reject ───────────────────────────────────────────────────────
// POST /challenges/approve — approves a challenge
// No dedicated reject endpoint; update challenge status to 'rejected' via PUT

export async function approveChallenge(challengeId: string): Promise<Challenge> {
  const res = await apiClient.post('/challenges/approve', { challenge_id: challengeId });
  return res.data;
}

export async function rejectChallenge(challengeId: string, reason: string): Promise<void> {
  // No dedicated reject endpoint — update the challenge status
  await apiClient.put(`/challenges/${challengeId}`, {
    status: 'rejected',
    metadata_json: { rejection_reason: reason },
  } as any);
}

// ─── AI Generation ──────────────────────────────────────────────────────────
// POST /challenges/ai-generate — triggers AI challenge generation

export async function requestAIGeneration(payload: AIGenerateRequest): Promise<AIGenerateResponse> {
  const res = await apiClient.post('/challenges/ai-generate', payload);
  return res.data;
}

// For listing AI-generated challenges that are pending review, use the challenge list with source=ai_generated
export async function listAIGeneratedChallenges(status?: ChallengeStatus): Promise<Challenge[]> {
  const params: ChallengeListParams = { source: 'ai_generated', limit: 50 };
  if (status) params.status = status;
  const { items } = await listChallenges(params);
  return items;
}

// ─── Review Queue ───────────────────────────────────────────────────────────
// Uses GET /admin/challenge-reviews from admin-services.ts
// Re-export for convenience in challenge pages

export async function listChallengeReviews(status?: string): Promise<ChallengeReview[]> {
  const params = status ? { status } : undefined;
  const res = await apiClient.get('/admin/challenge-reviews', { params }).catch(() => ({ data: [] }));
  return toArray<ChallengeReview>(res.data, ['items', 'reviews', 'results']);
}

// ─── Import / Export ────────────────────────────────────────────────────────

export async function importChallenges(file: File): Promise<{ imported: number; errors: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/challenges/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function exportChallenges(ids: string[]): Promise<Blob> {
  const res = await apiClient.get('/challenges/export', {
    params: { ids: ids.join(',') },
    responseType: 'blob',
  });
  return res.data;
}
