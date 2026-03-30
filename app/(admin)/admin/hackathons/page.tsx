'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getHackathons } from '@/lib/api/services';
import { transitionHackathon, deleteHackathon } from '@/lib/api/admin-hackathon-services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  ArrowRightLeft,
  Activity,
  Copy,
  Archive,
  Trash2,
  Trophy,
  Loader2,
} from 'lucide-react';
import type { Hackathon, HackathonStatus } from '@/types/api';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
  registration_open: { label: 'Inscripciones', className: 'bg-unad-gold/10 text-unad-gold' },
  active: { label: 'Activo', className: 'bg-emerald-500/10 text-emerald-500' },
  paused: { label: 'Pausado', className: 'bg-amber-500/10 text-amber-500' },
  finished: { label: 'Finalizado', className: 'bg-primary/10 text-primary' },
  archived: { label: 'Archivado', className: 'bg-muted/50 text-muted-foreground/60' },
};

const SCOPE_LABELS: Record<string, string> = {
  internal: 'Interno',
  zonal: 'Zonal',
  open: 'Abierto',
};

const MODE_LABELS: Record<string, string> = {
  live: 'En Vivo',
  practice: 'Práctica',
};

type TabValue = 'all' | 'active' | 'draft' | 'finished';

export default function AdminHackathonsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ action: string; hackathon: Hackathon; targetStatus?: HackathonStatus } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.hackathons.list({ scope: 'admin' }),
    queryFn: () => getHackathons({ limit: 200 }),
  });

  const hackathons: Hackathon[] = useMemo(() => {
    const all = (data as any)?.items ?? (Array.isArray(data) ? data : []);
    return all;
  }, [data]);

  const filtered = useMemo(() => {
    let list = hackathons;
    if (tab === 'active') list = list.filter((h) => h.status === 'active' || h.status === 'registration_open');
    else if (tab === 'draft') list = list.filter((h) => h.status === 'draft');
    else if (tab === 'finished') list = list.filter((h) => h.status === 'finished' || h.status === 'archived');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((h) => h.name.toLowerCase().includes(q));
    }
    return list;
  }, [hackathons, tab, search]);

  const transitionMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: HackathonStatus }) => transitionHackathon(id, status),
    onSuccess: () => {
      toast({ title: 'Estado actualizado' });
      queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.all });
      setConfirmDialog(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado.', variant: 'destructive' });
    },
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => transitionHackathon(id, 'archived'),
    onSuccess: () => {
      toast({ title: 'Hackathon archivado' });
      queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.all });
      setConfirmDialog(null);
    },
  });

  function handleConfirm() {
    if (!confirmDialog) return;
    if (confirmDialog.action === 'transition' && confirmDialog.targetStatus) {
      transitionMut.mutate({ id: confirmDialog.hackathon.id, status: confirmDialog.targetStatus });
    } else if (confirmDialog.action === 'archive') {
      archiveMut.mutate(confirmDialog.hackathon.id);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader title="Hackathones" description="Gestión de hackathones de la sede" />
        <Button onClick={() => router.push('/admin/hackathons/create')}>
          <Plus className="w-4 h-4 mr-1" /> Crear Hackathon
        </Button>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="draft">Borradores</TabsTrigger>
            <TabsTrigger value="finished">Finalizados</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar hackathon..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Trophy className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No se encontraron hackathones</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-4 py-3 text-left">Título</th>
                    <th className="px-4 py-3 text-left">Alcance</th>
                    <th className="px-4 py-3 text-left">Modo</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Fechas</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((h) => {
                    const st = STATUS_STYLES[h.status] ?? { label: h.status, className: 'bg-muted text-muted-foreground' };
                    return (
                      <tr key={h.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/admin/hackathons/${h.id}/edit`)}
                            className="font-medium hover:text-primary transition-colors text-left"
                          >
                            {h.name}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">{SCOPE_LABELS[h.scope] ?? h.scope}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs">{MODE_LABELS[h.mode] ?? h.mode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${st.className} border-0 text-[10px]`}>{st.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(h.starts_at)} – {formatDate(h.ends_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/admin/hackathons/${h.id}/edit`)}>
                                <Pencil className="w-4 h-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              {h.status === 'active' && (
                                <DropdownMenuItem onClick={() => router.push(`/admin/hackathons/${h.id}/monitor`)}>
                                  <Activity className="w-4 h-4 mr-2" /> Monitorear
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {h.status === 'draft' && (
                                <DropdownMenuItem onClick={() => setConfirmDialog({ action: 'transition', hackathon: h, targetStatus: 'registration_open' })}>
                                  <ArrowRightLeft className="w-4 h-4 mr-2" /> Abrir Inscripciones
                                </DropdownMenuItem>
                              )}
                              {h.status === 'registration_open' && (
                                <DropdownMenuItem onClick={() => setConfirmDialog({ action: 'transition', hackathon: h, targetStatus: 'active' })}>
                                  <ArrowRightLeft className="w-4 h-4 mr-2" /> Iniciar Hackathon
                                </DropdownMenuItem>
                              )}
                              {h.status === 'active' && (
                                <>
                                  <DropdownMenuItem onClick={() => setConfirmDialog({ action: 'transition', hackathon: h, targetStatus: 'paused' })}>
                                    <ArrowRightLeft className="w-4 h-4 mr-2" /> Pausar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setConfirmDialog({ action: 'transition', hackathon: h, targetStatus: 'finished' })} className="text-destructive">
                                    <ArrowRightLeft className="w-4 h-4 mr-2" /> Finalizar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {h.status === 'paused' && (
                                <DropdownMenuItem onClick={() => setConfirmDialog({ action: 'transition', hackathon: h, targetStatus: 'active' })}>
                                  <ArrowRightLeft className="w-4 h-4 mr-2" /> Reanudar
                                </DropdownMenuItem>
                              )}
                              {h.status === 'finished' && (
                                <DropdownMenuItem onClick={() => setConfirmDialog({ action: 'archive', hackathon: h })}>
                                  <Archive className="w-4 h-4 mr-2" /> Archivar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar acción</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === 'archive'
                ? `¿Archivar el hackathon "${confirmDialog?.hackathon?.name}"? Esta acción no se puede deshacer.`
                : `¿Cambiar el estado de "${confirmDialog?.hackathon?.name}" a ${STATUS_STYLES[confirmDialog?.targetStatus ?? '']?.label ?? confirmDialog?.targetStatus}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={transitionMut.isPending || archiveMut.isPending}>
              {(transitionMut.isPending || archiveMut.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
