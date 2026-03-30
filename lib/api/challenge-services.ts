import { apiClient } from './client';
import type {
  ChallengePublic,
  TestCasePublic,
  Submission,
  SubmissionDetail,
  SubmissionCreate,
  SubmissionTestResult,
  HintResponse,
  AskDocumentsRequest,
  AskDocumentsResponse,
  DocumentSubmission,
  GradeResult,
} from '@/types/api';

// ─── Challenge Detail ──────────────────────────────────────────

export async function getChallengeDetail(id: string): Promise<ChallengePublic> {
  const { data } = await apiClient.get<ChallengePublic>(`/challenges/${id}`);
  return data;
}

export async function getChallengeTestCases(id: string): Promise<TestCasePublic[]> {
  const { data } = await apiClient.get<TestCasePublic[]>(`/challenges/${id}/test-cases`);
  return data;
}

// ─── Run Code (dry run, example tests only) ─────────────────────

export interface RunCodeRequest {
  source_code: string;
  language: string;
}

export interface RunTestResult {
  test_case_index: number;
  input: string;
  expected_output: string;
  actual_output: string | null;
  passed: boolean;
  status: string;
  execution_time_ms: number;
  memory_used_mb: number;
  stderr: string | null;
}

export interface RunCodeResponse {
  results: RunTestResult[];
  total_passed: number;
  total_tests: number;
  overall_status: string;
}

export async function runCode(
  challengeId: string,
  payload: RunCodeRequest
): Promise<RunCodeResponse> {
  const { data } = await apiClient.post<RunCodeResponse>(
    `/challenges/${challengeId}/run`,
    payload
  );
  return data;
}

// ─── Submit Code ───────────────────────────────────────────────

export async function submitCode(payload: SubmissionCreate): Promise<Submission> {
  const { data } = await apiClient.post<Submission>('/submissions', payload);
  return data;
}

// ─── Submissions ──────────────────────────────────────────────

export interface SubmissionListParams {
  hackathon_id?: string;
  challenge_id?: string;
  skip?: number;
  limit?: number;
}

export async function getSubmissions(params?: SubmissionListParams): Promise<Submission[]> {
  const { data } = await apiClient.get<Submission[]>('/submissions', { params });
  return Array.isArray(data) ? data : [];
}

export async function getSubmissionDetail(id: string): Promise<SubmissionDetail> {
  const { data } = await apiClient.get<SubmissionDetail>(`/submissions/${id}`);
  return data;
}

export async function getSubmissionTestResults(id: string): Promise<SubmissionTestResult[]> {
  const { data } = await apiClient.get<SubmissionTestResult[]>(`/submissions/${id}/test-results`);
  return data;
}

// ─── Hints ─────────────────────────────────────────────────────

export interface RequestHintPayload {
  hackathon_id: string;
  hint_level: number;
  student_message: string;
  student_code?: string | null;
}

export async function requestHint(
  challengeId: string,
  payload: RequestHintPayload
): Promise<HintResponse> {
  const { data } = await apiClient.post<HintResponse>(
    `/challenges/${challengeId}/hints`,
    payload
  );
  return data;
}

// ─── Document Submissions ──────────────────────────────────────

export async function submitDocument(
  challengeId: string,
  hackathonId: string,
  file: File
): Promise<DocumentSubmission> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<DocumentSubmission>(
    `/hackathons/${hackathonId}/challenges/${challengeId}/submit-document`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function getDocumentSubmissions(params: {
  hackathon_id: string;
  challenge_id: string;
}): Promise<DocumentSubmission[]> {
  const { data } = await apiClient.get<DocumentSubmission[] | { submissions: DocumentSubmission[] } | { items: DocumentSubmission[] }>(
    '/submissions',
    { params }
  );
  // Handle both array and wrapped response
  if (Array.isArray(data)) return data;
  return (data as any).submissions ?? (data as any).items ?? [];
}

export async function getDocumentSubmissionDetail(
  id: string
): Promise<DocumentSubmission> {
  const { data } = await apiClient.get<DocumentSubmission>(
    `/submissions/${id}`
  );
  return data;
}

// ─── Grading ───────────────────────────────────────────────────

export async function getGradeResult(
  submissionId: string
): Promise<GradeResult> {
  const { data } = await apiClient.get<GradeResult>(
    `/grading/submissions/${submissionId}/grade`
  );
  return data;
}

// ─── Document Q&A (RAG) ────────────────────────────────────────

export async function askDocuments(
  payload: AskDocumentsRequest
): Promise<AskDocumentsResponse> {
  const { data } = await apiClient.post<AskDocumentsResponse>(
    '/ai/ask-documents',
    payload
  );
  return data;
}

// ─── Tab Tracking ──────────────────────────────────────────────

export async function reportTabEvent(
  hackathonId: string,
  event: 'blur' | 'focus'
): Promise<void> {
  await apiClient.post(`/hackathons/${hackathonId}/tab-event`, {
    event,
    timestamp: new Date().toISOString(),
  });
}
