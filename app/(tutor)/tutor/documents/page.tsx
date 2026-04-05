'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, FolderOpen, FileText, Trash2, Loader2, Calendar, ArrowRight } from 'lucide-react';
import { queryKeys } from '@/lib/query-client';
import { createCollection, deleteCollection, listCollections, listDocuments } from '@/lib/api/document-services';
import type { DocumentCollection } from '@/types/api';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function TutorDocumentsPage() {
  const qc = useQueryClient();
  const currentSede = useAuthStore((s) => s?.currentSede);
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: '',
    name: '',
  });
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const { data: collections, isLoading } = useQuery({
    queryKey: queryKeys.documents.collections,
    queryFn: listCollections,
  });

  const collectionDocQueries = useQueries({
    queries: (collections ?? []).map((col) => ({
      queryKey: queryKeys.documents.collectionDocs(col.id),
      queryFn: () => listDocuments(col.id),
      enabled: Boolean(col.id),
    })),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createCollection({
        name: newName.trim(),
        description: newDesc.trim() || null,
        owner_type: 'sede',
        owner_id: currentSede?.id ?? '',
      }),
    onSuccess: () => {
      toast.success('Coleccion creada');
      qc.invalidateQueries({ queryKey: queryKeys.documents.collections });
      setCreateDialog(false);
      setNewName('');
      setNewDesc('');
    },
    onError: () => toast.error('Error al crear la coleccion'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      toast.success('Coleccion eliminada');
      qc.invalidateQueries({ queryKey: queryKeys.documents.collections });
      setDeleteDialog({ open: false, id: '', name: '' });
    },
    onError: () => toast.error('Error al eliminar la coleccion'),
  });

  const getCollectionDocCount = (col: DocumentCollection, index: number) => {
    const docs = collectionDocQueries[index]?.data;
    return Array.isArray(docs) ? docs.length : col.document_count;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Mis Documentos"
          description="Crea colecciones y sube materiales de apoyo para que tus estudiantes consulten los recursos de la sede."
        />
        <Button onClick={() => setCreateDialog(true)} disabled={!currentSede?.id}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Coleccion
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : !collections?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No hay colecciones de documentos creadas aun</p>
            <Button className="mt-4" onClick={() => setCreateDialog(true)} disabled={!currentSede?.id}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primera coleccion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((col: DocumentCollection, index) => (
            <Link key={col.id} href={`/tutor/documents/${col.id}`}>
              <Card className="group h-full cursor-pointer transition-all hover:border-primary/30">
                <CardContent className="space-y-3 p-5">
                  {(() => {
                    const docCount = getCollectionDocCount(col, index);
                    return (
                      <>
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15">
                      {docCount} docs
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-semibold transition-colors group-hover:text-primary">{col.name}</h3>
                    {col.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{col.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {docCount} documento(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(col.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Gestionar coleccion</p>
                        <p className="text-[11px] text-muted-foreground">
                          Ver, subir y administrar documentos
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        Abrir
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteDialog({ open: true, id: col.id, name: col.name });
                    }}
                    className="text-xs text-destructive opacity-0 transition-opacity hover:underline group-hover:opacity-100"
                  >
                    <Trash2 className="mr-1 inline h-3 w-3" />
                    Eliminar
                  </button>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Coleccion</DialogTitle>
            <DialogDescription>
              Organiza materiales de apoyo para tus estudiantes dentro de la sede activa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="collection-name">Nombre</Label>
              <Input
                id="collection-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Material de Programacion Competitiva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-description">Descripcion</Label>
              <Textarea
                id="collection-description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Describe brevemente el contenido de esta coleccion"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => createMut.mutate()} disabled={!newName.trim() || !currentSede?.id || createMut.isPending}>
              {createMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: '', name: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Coleccion</DialogTitle>
            <DialogDescription>
              Se eliminara &quot;{deleteDialog.name}&quot; junto con sus documentos. Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: '', name: '' })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMut.mutate(deleteDialog.id)}
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
