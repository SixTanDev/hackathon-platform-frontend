'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { listCollections, createCollection, deleteCollection } from '@/lib/api/document-services';
import type { DocumentCollection, CollectionOwnerType } from '@/types/api';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Plus, FolderOpen, FileText, Users, Trophy, Trash2,
  Loader2, Calendar, User
} from 'lucide-react';

const OWNER_TYPE_CONFIG: Record<CollectionOwnerType, { label: string; icon: typeof FolderOpen; class: string }> = {
  sede: { label: 'Sede', icon: FolderOpen, class: 'bg-primary/10 text-primary border-primary/20' },
  research_group: { label: 'Grupo de Investigación', icon: Users, class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  hackathon: { label: 'Hackathon', icon: Trophy, class: 'bg-accent/10 text-accent border-accent/20' },
};

export default function DocumentCollectionsPage() {
  const qc = useQueryClient();
  const { currentSede } = useAuthStore();
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newOwnerType, setNewOwnerType] = useState<CollectionOwnerType>('sede');

  const { data: collections, isLoading } = useQuery({
    queryKey: queryKeys.documents.collections,
    queryFn: listCollections,
  });

  const createMut = useMutation({
    mutationFn: () => createCollection({
      name: newName,
      description: newDesc || null,
      owner_type: newOwnerType,
      owner_id: currentSede?.id ?? '',
    }),
    onSuccess: () => {
      toast.success('Colección creada');
      qc.invalidateQueries({ queryKey: queryKeys.documents.collections });
      setCreateDialog(false);
      setNewName(''); setNewDesc('');
    },
    onError: () => toast.error('Error al crear colección'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      toast.success('Colección eliminada');
      qc.invalidateQueries({ queryKey: queryKeys.documents.collections });
      setDeleteDialog({ open: false, id: '', name: '' });
    },
    onError: () => toast.error('Error al eliminar'),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader title="Colecciones de Documentos" description="Gestiona los materiales de estudio y documentos del curso" />
        <Button onClick={() => setCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />Crear Colección</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !collections?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">No hay colecciones aún</p>
            <Button className="mt-4" onClick={() => setCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />Crear Primera Colección</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col: DocumentCollection) => {
            const ownerCfg = OWNER_TYPE_CONFIG[col.owner_type] ?? OWNER_TYPE_CONFIG.sede;
            const OwnerIcon = ownerCfg.icon;
            return (
              <Link key={col.id} href={`/admin/documents/${col.id}`}>
                <Card className="h-full hover:border-primary/30 transition-all cursor-pointer group">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-lg bg-primary/10">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="outline" className={ownerCfg.class}>
                        <OwnerIcon className="h-3 w-3 mr-1" />{ownerCfg.label}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{col.name}</h3>
                      {col.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{col.description}</p>}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{col.document_count} documento(s)</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(col.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                    </div>
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteDialog({ open: true, id: col.id, name: col.name }); }}
                      className="text-xs text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 inline mr-1" />Eliminar
                    </button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Colección</DialogTitle>
            <DialogDescription>Crea una nueva colección para organizar documentos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Materiales de Algoritmos" />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descripción breve..." />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Propietario</Label>
              <Select value={newOwnerType} onValueChange={v => setNewOwnerType(v as CollectionOwnerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sede">Sede</SelectItem>
                  <SelectItem value="research_group">Grupo de Investigación</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate()} disabled={!newName.trim() || createMut.isPending}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={o => !o && setDeleteDialog({ open: false, id: '', name: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Colección</DialogTitle>
            <DialogDescription>¿Eliminar &quot;{deleteDialog.name}&quot;? Se perderán todos los documentos.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: '', name: '' })}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteDialog.id)}>
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
