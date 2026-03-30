import apiClient from './client';
import type {
  DocumentCollection,
  DocumentCollectionCreate,
  DocumentCollectionUpdate,
  DocumentItem,
  DocumentSource,
} from '@/types/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DocumentStatusResponse {
  id: string;
  processing_status: 'uploaded' | 'processing' | 'ready' | 'error';
  processing_error: string | null;
  chunk_count: number;
  processing_step?: string | null; // e.g. 'extracting_text', 'chunking', 'embedding'
}

export interface SemanticSearchResult {
  document_id: string;
  document_title: string;
  page_number: number | null;
  section_title: string | null;
  content: string;
  relevance_score: number;
  chunk_id?: string;
}

export interface HackathonAccessPayload {
  collection_id: string;
  hackathon_id: string;
}

// ─── Collections CRUD ───────────────────────────────────────────────────────

export async function listCollections(): Promise<DocumentCollection[]> {
  const res = await apiClient.get('/document-collections');
  const data = res.data;
  if (Array.isArray(data)) return data;
  return data.collections ?? data.items ?? [];
}

export async function getCollection(id: string): Promise<DocumentCollection> {
  const res = await apiClient.get(`/document-collections/${id}`);
  return res.data;
}

export async function createCollection(payload: DocumentCollectionCreate): Promise<DocumentCollection> {
  const res = await apiClient.post('/document-collections', payload);
  return res.data;
}

export async function updateCollection(id: string, payload: DocumentCollectionUpdate): Promise<DocumentCollection> {
  const res = await apiClient.put(`/document-collections/${id}`, payload);
  return res.data;
}

export async function deleteCollection(id: string): Promise<void> {
  await apiClient.delete(`/document-collections/${id}`);
}

// ─── Documents ──────────────────────────────────────────────────────────────

export async function listDocuments(collectionId: string): Promise<DocumentItem[]> {
  const res = await apiClient.get(`/document-collections/${collectionId}/documents`);
  const data = res.data;
  if (Array.isArray(data)) return data;
  return data.documents ?? data.items ?? [];
}

export async function uploadDocument(collectionId: string, file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post(`/document-collections/${collectionId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getDocumentStatus(documentId: string): Promise<DocumentStatusResponse> {
  const res = await apiClient.get(`/documents/${documentId}/status`).catch(() => ({
    data: { id: documentId, processing_status: 'processing' as const, processing_error: null, chunk_count: 0 },
  }));
  return res.data;
}

export async function deleteDocument(_collectionId: string, documentId: string): Promise<void> {
  await apiClient.delete(`/documents/${documentId}`);
}

export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  // The API provides document status which may include a URL; fallback to constructing from status
  const res = await apiClient.get(`/documents/${documentId}/status`).catch(() => ({ data: { url: '' } }));
  return res.data?.url ?? res.data?.download_url ?? '';
}

// ─── Semantic Search ────────────────────────────────────────────────────────

export async function searchDocuments(
  collectionId: string,
  query: string,
  topK: number = 5
): Promise<SemanticSearchResult[]> {
  const res = await apiClient.post(`/document-collections/${collectionId}/search`, {
    query,
    top_k: topK,
  });
  const data = res.data;
  if (Array.isArray(data)) return data;
  return data.results ?? data.chunks ?? [];
}

// ─── Hackathon Access ───────────────────────────────────────────────────────

export async function grantHackathonAccess(payload: HackathonAccessPayload): Promise<void> {
  await apiClient.post('/document-collections/hackathon-access', payload);
}

export async function revokeHackathonAccess(payload: HackathonAccessPayload): Promise<void> {
  await apiClient.delete('/document-collections/hackathon-access', { data: payload });
}
