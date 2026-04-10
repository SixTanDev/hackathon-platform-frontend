'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listMyResearchGroups, createResearchGroup } from '@/lib/api/research-services';
import type { ResearchGroupCreate } from '@/lib/api/research-services';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Beaker,
  Plus,
  Users,
  FolderKanban,
  User,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ResearchGroupsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const currentRole = useAuthStore((s) => s?.currentRole);
  const user = useAuthStore((s) => s?.user);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const canCreate = currentRole === 'director_semillero' || currentRole === 'admin' || user?.is_superadmin;

  const { data: groups, isLoading } = useQuery({
    queryKey: queryKeys.research.groups,
    queryFn: listMyResearchGroups,
  });

  const createMut = useMutation({
    mutationFn: (p: ResearchGroupCreate) => createResearchGroup(p),
    onSuccess: (g) => {
      qc.invalidateQueries({ queryKey: queryKeys.research.groups });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      toast({ title: 'Grupo creado', description: `"${g.name}" creado exitosamente.` });
      router.push(`/research/groups/${g.id}`);
    },
    onError: () => toast({ title: 'Error', description: 'No se pudo crear el grupo.', variant: 'destructive' }),
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMut.mutate({ name: newName.trim(), description: newDesc.trim() });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Grupos de Investigación"
        description="Semilleros de investigación de los que eres miembro"
      >
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Grupo de Investigación
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !groups || groups.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Beaker className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium">No perteneces a ningún grupo de investigación</p>
            <p className="text-xs text-muted-foreground mt-1">
              {canCreate ? 'Crea un nuevo grupo para comenzar.' : 'Solicita a un director que te agregue a su grupo.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <Card
              key={g.id}
              className="border-border/50 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => router.push(`/research/groups/${g.id}`)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Beaker className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{g.name}</h3>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>

                {g.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {g.member_count ?? 0} miembro{(g.member_count ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <FolderKanban className="w-3.5 h-3.5" />
                    {g.project_count ?? 0} proyecto{(g.project_count ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <User className="w-3 h-3" />
                  Director: <span className="font-medium text-foreground">{g.director_name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Grupo de Investigación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre del grupo *</Label>
              <Input
                placeholder="Ej: Semillero de IA Aplicada"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Describe los objetivos y áreas de investigación del grupo..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Crear Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
