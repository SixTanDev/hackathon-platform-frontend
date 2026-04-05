import apiClient from './client';
import { toArray } from './response-utils';
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
  return toArray<DocumentCollection>(res.data, ['collections', 'items', 'results']);
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
  return toArray<DocumentItem>(res.data, ['documents', 'items', 'results']);
}

export async function uploadDocument(collectionId: string, file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post(`/document-collections/${collectionId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getDocumentStatus(documentId: string, collectionId?: string): Promise<DocumentStatusResponse> {
  try {
    // Try global route first
    const res = await apiClient.get(`/documents/${documentId}/status`);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    // If not found or bad request, and we have a collectionId, try the collection-specific route
    if ((status === 404 || status === 400) && collectionId) {
      console.log(`[DocumentService] Fallback for status: trying collection-specific route for ${documentId} in ${collectionId}`);
      try {
        const res = await apiClient.get(`/document-collections/${collectionId}/documents/${documentId}/status`);
        return res.data;
      } catch (fallbackErr: any) {
        console.error(`[DocumentService] Status fallback failed for ${documentId}:`, fallbackErr?.message);
        throw fallbackErr;
      }
    }
    throw err;
  }
}

export async function deleteDocument(collectionId: string, documentId: string): Promise<void> {
  try {
    await apiClient.delete(`/document-collections/${collectionId}/documents/${documentId}`);
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status !== 404) throw err;
    // Fallback for backends that still use the legacy endpoint
    try {
      await apiClient.delete(`/documents/${documentId}`);
    } catch (fallbackErr: any) {
      const fallbackStatus = fallbackErr?.status ?? fallbackErr?.response?.status;
      const detail = fallbackErr?.detail ?? fallbackErr?.response?.data?.detail ?? '';
      const notFound =
        fallbackStatus === 400 || fallbackStatus === 404
          ? String(detail).toLowerCase().includes('not found')
          : false;
      // Some backends delete successfully but return an invalid/abrupt response through the proxy.
      if (fallbackStatus === 502 || notFound) return;
      throw fallbackErr;
    }
  }
}

export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  // The API provides document status which may include a URL; fallback to constructing from status
  const res = await apiClient.get(`/documents/${documentId}/status`).catch(() => ({ data: { url: '' } }));
  return res.data?.url ?? res.data?.download_url ?? '';
}

export async function downloadDocumentBlob(documentId: string, collectionId?: string): Promise<Blob> {
  const endpoints = [
    `/documents/${documentId}/download`,
    collectionId ? `/document-collections/${collectionId}/documents/${documentId}/download` : null,
    `/documents/${documentId}`,
    collectionId ? `/document-collections/${collectionId}/documents/${documentId}` : null,
  ].filter(Boolean) as string[];

  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const res = await apiClient.get(endpoint, { responseType: 'blob' });
      if (res.data instanceof Blob) return res.data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error('No se pudo descargar el documento');
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
  return toArray<SemanticSearchResult>(res.data, ['results', 'chunks', 'items']);
}

// ─── Hackathon Access ───────────────────────────────────────────────────────

export async function grantHackathonAccess(payload: HackathonAccessPayload): Promise<void> {
  await apiClient.post('/document-collections/hackathon-access', payload);
}

export async function revokeHackathonAccess(payload: HackathonAccessPayload): Promise<void> {
  await apiClient.delete('/document-collections/hackathon-access', { data: payload });
}
