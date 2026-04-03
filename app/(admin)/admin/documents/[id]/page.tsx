'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  getCollection, updateCollection, listDocuments, uploadDocument,
  deleteDocument, getDocumentStatus, grantHackathonAccess, revokeHackathonAccess,
} from '@/lib/api/document-services';
import type { DocumentStatusResponse } from '@/lib/api/document-services';
import { getHackathons } from '@/lib/api/services';
import type { DocumentItem } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft, Upload, FileText, Trash2, Download, Loader2, CheckCircle2,
  XCircle, Clock, RefreshCw, Search, LinkIcon, Unlink, Pencil, Save, X
} from 'lucide-react';

const FILE_TYPES = ['.pdf', '.docx', '.txt', '.md'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const PROCESSING_STEPS: Record<string, string> = {
  uploaded: 'Subido',
  extracting_text: 'Extrayendo texto...',
  chunking: 'Generando fragmentos...',
  embedding: 'Creando embeddings...',
  processing: 'Procesando...',
  ready: 'Listo',
  error: 'Error',
};

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: typeof Clock }> = {
  uploaded: { label: 'Subido', class: 'bg-gray-500/10 text-gray-400', icon: Clock },
  processing: { label: 'Procesando', class: 'bg-amber-500/10 text-amber-400', icon: Loader2 },
  ready: { label: 'Listo', class: 'bg-green-500/10 text-green-400', icon: CheckCircle2 },
  error: { label: 'Error', class: 'bg-red-500/10 text-red-400', icon: XCircle },
};

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; docId: string; name: string }>({ open: false, docId: '', name: '' });
  const [processingDocs, setProcessingDocs] = useState<Set<string>>(new Set());
  const rateLimitUntilRef = useRef<number>(0);

  // Data
  const { data: collection, isLoading: loadingCollection } = useQuery({
    queryKey: queryKeys.documents.collectionDetail(id),
    queryFn: () => getCollection(id),
  });

  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: queryKeys.documents.collectionDocs(id),
    queryFn: () => listDocuments(id),
  });

  const { data: hackathons } = useQuery({
    queryKey: queryKeys.hackathons.all,
    queryFn: () => getHackathons(),
  });

  const hackathonList = Array.isArray(hackathons) ? hackathons : (hackathons as unknown as { items?: unknown[] })?.items ?? [];

  // Populate edit fields
  useEffect(() => {
    if (collection) {
      setEditName(collection.name);
      setEditDesc(collection.description ?? '');
    }
  }, [collection]);

  // Poll processing documents
  useEffect(() => {
    if (!documents) return;
    const processing = documents.filter(d => d.processing_status === 'processing' || d.processing_status === 'uploaded');
    if (processing.length === 0) { setProcessingDocs(new Set()); return; }
    setProcessingDocs(new Set(processing.map(d => d.id)));

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) return;
      const now = Date.now();
      if (rateLimitUntilRef.current > now) {
        timeoutId = setTimeout(poll, rateLimitUntilRef.current - now);
        return;
      }

      let changed = false;
      for (const doc of processing) {
        try {
          const status = await getDocumentStatus(doc.id);
          if (status.processing_status === 'ready' || status.processing_status === 'error') {
            changed = true;
          }
        } catch (err: any) {
          const status = err?.status ?? err?.response?.status;
          const detail = err?.detail ?? err?.response?.data?.detail ?? '';
          if (status === 429) {
            rateLimitUntilRef.current = Date.now() + 60_000;
            break;
          }
          if ((status === 400 || status === 404) && String(detail).toLowerCase().includes('not found')) {
            changed = true;
          }
        }
      }

      if (changed) {
        qc.invalidateQueries({ queryKey: queryKeys.documents.collectionDocs(id) });
      }

      timeoutId = setTimeout(poll, 15_000);
    };

    timeoutId = setTimeout(poll, 15_000);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [documents, id, qc]);

  // Mutations
  const updateMut = useMutation({
    mutationFn: () => updateCollection(id, { name: editName, description: editDesc || null }),
    onSuccess: () => {
      toast.success('Colección actualizada');
      qc.invalidateQueries({ queryKey: queryKeys.documents.collectionDetail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.documents.collections });
      setEditing(false);
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: (docId: string) => deleteDocument(id, docId),
    onSuccess: () => {
      toast.success('Documento eliminado');
      qc.invalidateQueries({ queryKey: queryKeys.documents.collectionDocs(id) });
      qc.invalidateQueries({ queryKey: queryKeys.documents.collectionDetail(id) });
      setDeleteDialog({ open: false, docId: '', name: '' });
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const linkMut = useMutation({
    mutationFn: (hackathonId: string) => grantHackathonAccess({ collection_id: id, hackathon_id: hackathonId }),
    onSuccess: () => toast.success('Colección vinculada al hackathon'),
    onError: () => toast.error('Error al vincular'),
  });

  const unlinkMut = useMutation({
    mutationFn: (hackathonId: string) => revokeHackathonAccess({ collection_id: id, hackathon_id: hackathonId }),
    onSuccess: () => toast.success('Vinculación eliminada'),
    onError: () => toast.error('Error al desvincular'),
  });

  // File upload
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const valid = fileArray.filter(f => {
      if (f.size > MAX_FILE_SIZE) { toast.error(`${f.name} excede 10MB`); return false; }
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!FILE_TYPES.includes(ext)) { toast.error(`${f.name}: formato no soportado`); return false; }
      return true;
    });
    if (!valid.length) return;

    setUploading(true);
    let uploaded = 0;
    for (const file of valid) {
      try {
        await uploadDocument(id, file);
        uploaded++;
      } catch {
        toast.error(`Error al subir ${file.name}`);
      }
    }
    if (uploaded > 0) {
      toast.success(`${uploaded} documento(s) subido(s)`);
      qc.invalidateQueries({ queryKey: queryKeys.documents.collectionDocs(id) });
      qc.invalidateQueries({ queryKey: queryKeys.documents.collectionDetail(id) });
    }
    setUploading(false);
  }, [id, qc]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loadingCollection) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!collection) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Colección no encontrada</p>
        <Link href="/admin/documents"><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/documents"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        {editing ? (
          <div className="flex-1 flex items-center gap-3">
            <Input value={editName} onChange={e => setEditName(e.target.value)} className="max-w-xs" />
            <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descripción..." className="max-w-sm" />
            <Button size="sm" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}><Save className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{collection.name}</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
            </div>
            {collection.description && <p className="text-sm text-muted-foreground">{collection.description}</p>}
          </div>
        )}
        <Link href={`/admin/documents/${id}/search`}>
          <Button variant="outline"><Search className="h-4 w-4 mr-2" />Buscar en Documentos</Button>
        </Link>
      </div>

      {/* Upload zone */}
      <Card>
        <CardHeader><CardTitle className="text-base">Subir Documentos</CardTitle></CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Subiendo documentos...</p>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm font-medium">Arrastra archivos aquí o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD — Máximo 10MB por archivo</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentos ({documents?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDocs ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !documents?.length ? (
            <p className="text-center text-muted-foreground py-8">No hay documentos aún</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-3 text-left font-medium">Archivo</th>
                    <th className="p-3 text-left font-medium">Tipo</th>
                    <th className="p-3 text-right font-medium">Tamaño</th>
                    <th className="p-3 text-left font-medium">Estado</th>
                    <th className="p-3 text-right font-medium">Fragmentos</th>
                    <th className="p-3 text-left font-medium">Subido</th>
                    <th className="p-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc: DocumentItem) => {
                    const stCfg = STATUS_CONFIG[doc.processing_status] ?? STATUS_CONFIG.uploaded;
                    const StIcon = stCfg.icon;
                    const isProcessing = doc.processing_status === 'processing' || doc.processing_status === 'uploaded';
                    return (
                      <tr key={doc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-xs">{doc.original_filename}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs uppercase">{doc.file_type}</Badge>
                        </td>
                        <td className="p-3 text-right text-xs text-muted-foreground font-mono">{formatSize(doc.file_size_bytes)}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className={stCfg.class}>
                            <StIcon className={`h-3 w-3 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />
                            {stCfg.label}
                          </Badge>
                          {doc.processing_status === 'error' && doc.processing_error && (
                            <p className="text-xs text-red-400 mt-1">{doc.processing_error}</p>
                          )}
                        </td>
                        <td className="p-3 text-right text-xs font-mono">{doc.chunk_count > 0 ? doc.chunk_count : '—'}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Descargar">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => setDeleteDialog({ open: true, docId: doc.id, name: doc.original_filename })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            {doc.processing_status === 'error' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400" title="Reintentar">
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hackathon linking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vincular a Hackathones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">Los estudiantes inscritos en estos hackathones podrán consultar los documentos de esta colección.</p>
          {Array.isArray(hackathonList) && hackathonList.length > 0 ? (
            <div className="space-y-2">
              {(hackathonList as { id: string; name: string }[]).slice(0, 10).map(h => (
                <div key={h.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20">
                  <span className="text-sm">{h.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => linkMut.mutate(h.id)} disabled={linkMut.isPending}>
                      <LinkIcon className="h-3 w-3 mr-1" />Vincular
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => unlinkMut.mutate(h.id)} disabled={unlinkMut.isPending}>
                      <Unlink className="h-3 w-3 mr-1" />Desvincular
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay hackathones disponibles</p>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={o => !o && setDeleteDialog({ open: false, docId: '', name: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Documento</DialogTitle>
            <DialogDescription>¿Eliminar &quot;{deleteDialog.name}&quot;? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, docId: '', name: '' })}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteDialog.docId)}>
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
