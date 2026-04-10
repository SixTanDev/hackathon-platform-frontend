'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { queryKeys } from '@/lib/query-client';
import {
  deleteDocument,
  getCollection,
  getDocumentStatus,
  listDocuments,
  updateCollection,
  uploadDocument,
} from '@/lib/api/document-services';
import type { DocumentItem } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const FILE_TYPES = ['.pdf', '.docx', '.txt', '.md'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: typeof Clock }> = {
  uploaded: { label: 'Subido', class: 'bg-gray-500/10 text-gray-400', icon: Clock },
  processing: { label: 'Procesando', class: 'bg-amber-500/10 text-amber-400', icon: Loader2 },
  ready: { label: 'Listo', class: 'bg-green-500/10 text-green-400', icon: CheckCircle2 },
  error: { label: 'Error', class: 'bg-red-500/10 text-red-400', icon: XCircle },
};

export default function TutorCollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rateLimitUntilRef = useRef<number>(0);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; docId: string; name: string }>({
    open: false,
    docId: '',
    name: '',
  });

  const { data: collection, isLoading: loadingCollection } = useQuery({
    queryKey: queryKeys.documents.collectionDetail(id),
    queryFn: () => getCollection(id),
  });

  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: queryKeys.documents.collectionDocs(id),
    queryFn: () => listDocuments(id),
  });

  useEffect(() => {
    if (collection) {
      setEditName(collection.name);
      setEditDesc(collection.description ?? '');
    }
  }, [collection]);

  useEffect(() => {
    if (!documents?.length) return;

    const processing = documents.filter((doc) => doc.processing_status === 'processing' || doc.processing_status === 'uploaded');
    if (processing.length === 0) return;

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
          const status = await getDocumentStatus(doc.id, id);
          if (status.processing_status === 'ready' || status.processing_status === 'error') {
            changed = true;
          }
        } catch (err: any) {
          const status = err?.status ?? err?.response?.status;
          if (status === 429) {
            rateLimitUntilRef.current = Date.now() + 60_000;
            break;
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

  const updateMut = useMutation({
    mutationFn: () => updateCollection(id, { name: editName.trim(), description: editDesc.trim() || null }),
    onSuccess: () => {
      toast.success('Coleccion actualizada');
      qc.invalidateQueries({ queryKey: queryKeys.documents.collectionDetail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.documents.collections });
      setEditing(false);
    },
    onError: () => toast.error('Error al actualizar la coleccion'),
  });

  const deleteMut = useMutation({
    mutationFn: (docId: string) => deleteDocument(id, docId),
    onSuccess: () => {
      toast.success('Documento eliminado');
      qc.invalidateQueries({ queryKey: queryKeys.documents.collectionDocs(id) });
      qc.invalidateQueries({ queryKey: queryKeys.documents.collectionDetail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.documents.collections });
      setDeleteDialog({ open: false, docId: '', name: '' });
    },
    onError: () => toast.error('Error al eliminar el documento'),
  });

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((file) => {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} excede 10MB`);
          return false;
        }

        const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
        if (!FILE_TYPES.includes(ext)) {
          toast.error(`${file.name}: formato no soportado`);
          return false;
        }
        return true;
      });

      if (!validFiles.length) return;

      setUploading(true);
      let uploadedCount = 0;

      for (const file of validFiles) {
        try {
          await uploadDocument(id, file);
          uploadedCount++;
        } catch {
          toast.error(`Error al subir ${file.name}`);
        }
      }

      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} documento(s) subido(s)`);
        qc.invalidateQueries({ queryKey: queryKeys.documents.collectionDocs(id) });
        qc.invalidateQueries({ queryKey: queryKeys.documents.collectionDetail(id) });
        qc.invalidateQueries({ queryKey: queryKeys.documents.collections });
      }

      setUploading(false);
    },
    [id, qc]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loadingCollection) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Coleccion no encontrada</p>
        <Link href="/tutor/documents">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <Link href="/tutor/documents">
          <Button
            variant="ghost"
            className="h-10 rounded-full px-3 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Mis Documentos
          </Button>
        </Link>

        {editing ? (
          <div className="flex flex-1 items-center gap-3 pt-0.5">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-xs" />
            <Input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Descripcion..."
              className="max-w-sm"
            />
            <Button size="sm" onClick={() => updateMut.mutate()} disabled={updateMut.isPending || !editName.trim()}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Coleccion activa</p>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{collection.name}</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
            {collection.description && <p className="mt-1 text-sm text-muted-foreground">{collection.description}</p>}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subir Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Subiendo documentos...</p>
              </div>
            ) : (
              <>
                <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">Arrastra archivos aqui o haz clic para seleccionar</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, TXT, MD - Maximo 10MB por archivo</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentos ({documents?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDocs ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !documents?.length ? (
            <p className="py-8 text-center text-muted-foreground">No hay documentos aun</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-3 text-left font-medium">Archivo</th>
                    <th className="p-3 text-left font-medium">Tipo</th>
                    <th className="p-3 text-right font-medium">Tamano</th>
                    <th className="p-3 text-left font-medium">Estado</th>
                    <th className="p-3 text-right font-medium">Fragmentos</th>
                    <th className="p-3 text-left font-medium">Subido</th>
                    <th className="w-20 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc: DocumentItem) => {
                    const statusConfig = STATUS_CONFIG[doc.processing_status] ?? STATUS_CONFIG.uploaded;
                    const StatusIcon = statusConfig.icon;
                    const isProcessing = doc.processing_status === 'processing' || doc.processing_status === 'uploaded';

                    return (
                      <tr key={doc.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium">{doc.original_filename}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs uppercase">
                            {doc.file_type}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                          {formatSize(doc.file_size_bytes)}
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className={statusConfig.class}>
                            <StatusIcon className={`mr-1 h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`} />
                            {statusConfig.label}
                          </Badge>
                          {doc.processing_status === 'error' && doc.processing_error && (
                            <p className="mt-1 text-xs text-red-400">{doc.processing_error}</p>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-xs">{doc.chunk_count > 0 ? doc.chunk_count : '-'}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteDialog({ open: true, docId: doc.id, name: doc.original_filename })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, docId: '', name: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Documento</DialogTitle>
            <DialogDescription>
              Se eliminara &quot;{deleteDialog.name}&quot;. Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, docId: '', name: '' })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMut.mutate(deleteDialog.docId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
