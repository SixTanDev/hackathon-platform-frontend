'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  listZones,
  getZoneDetail,
  createZone,
  updateZone,
  deactivateZone,
  type ZoneListItem,
  type ZoneDetail,
} from '@/lib/api/superadmin-services';
import type { ZoneCreate } from '@/types/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Globe, Building2, Users, Trophy, Pencil, Eye, Power,
  Loader2, CheckCircle, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Provisioning progress steps
const PROVISION_STEPS = [
  { key: 'db', label: 'Creando base de datos...', progress: 33 },
  { key: 'migrate', label: 'Ejecutando migraciones...', progress: 66 },
  { key: 'done', label: 'Zona creada \u2713', progress: 100 },
];

export default function ZoneManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailZoneId, setDetailZoneId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ZoneListItem | null>(null);
  const [provisionStep, setProvisionStep] = useState(-1);

  // Create form
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editZoneId, setEditZoneId] = useState('');

  // Queries
  const { data: zones, isLoading } = useQuery({
    queryKey: queryKeys.superadmin.zones,
    queryFn: listZones,
  });

  const { data: zoneDetail, isLoading: loadingDetail } = useQuery({
    queryKey: queryKeys.superadmin.zoneDetail(detailZoneId ?? ''),
    queryFn: () => getZoneDetail(detailZoneId!),
    enabled: !!detailZoneId,
  });

  // Auto-slug
  useEffect(() => {
    setNewSlug(slugify(newName));
  }, [newName]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: ZoneCreate) => createZone(payload),
    onSuccess: () => {
      // Simulate provisioning
      setProvisionStep(0);
      const timers = PROVISION_STEPS.map((_, i) =>
        setTimeout(() => {
          setProvisionStep(i);
          if (i === PROVISION_STEPS.length - 1) {
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.superadmin.zones });
              toast({ title: 'Zona creada', description: `La zona "${newName}" ha sido creada exitosamente.` });
              setCreateOpen(false);
              setProvisionStep(-1);
              setNewName('');
              setNewSlug('');
            }, 1200);
          }
        }, (i + 1) * 1500)
      );
      return () => timers.forEach(clearTimeout);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo crear la zona.', variant: 'destructive' });
      setProvisionStep(-1);
    },
  });

  const editMutation = useMutation({
    mutationFn: () => updateZone(editZoneId, { name: editName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.superadmin.zones });
      toast({ title: 'Zona actualizada' });
      setEditOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo actualizar la zona.', variant: 'destructive' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.superadmin.zones });
      toast({ title: 'Zona desactivada' });
      setDeactivateTarget(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo desactivar la zona.', variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      name: newName,
      slug: newSlug,
    });
  };

  const openEdit = (z: ZoneListItem) => {
    setEditZoneId(z.id);
    setEditName(z.name);
    setEditOpen(true);
  };

  // Zone Detail View
  if (detailZoneId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setDetailZoneId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title={loadingDetail ? 'Cargando...' : zoneDetail?.name ?? 'Zona'}
            description={`Detalle de zona — Código: ${zoneDetail?.code ?? ''}`}
          />
        </div>

        {/* Zone Stats */}
        {loadingDetail ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : zoneDetail?.stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{zoneDetail.stats.sede_count}</p><p className="text-xs text-muted-foreground">Sedes</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{zoneDetail.stats.user_count}</p><p className="text-xs text-muted-foreground">Usuarios</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{zoneDetail.stats.hackathon_count}</p><p className="text-xs text-muted-foreground">Hackathones</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{zoneDetail.stats.events_this_month}</p><p className="text-xs text-muted-foreground">Eventos este mes</p></CardContent></Card>
          </div>
        ) : null}

        {/* Sedes in Zone */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Sedes en esta Zona</CardTitle></CardHeader>
          <CardContent>
            {loadingDetail ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : !zoneDetail?.sedes?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay sedes en esta zona</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead className="text-center">Usuarios</TableHead>
                    <TableHead className="text-center">Hackathones Activos</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zoneDetail.sedes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.city ?? '—'}</TableCell>
                      <TableCell className="text-center">{s.user_count}</TableCell>
                      <TableCell className="text-center">{s.active_hackathons}</TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? 'default' : 'secondary'}>
                          {s.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Gestión de Zonas"
          description="Administra las zonas de la plataforma"
        />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Crear Zona</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Nueva Zona</DialogTitle>
            </DialogHeader>

            {provisionStep >= 0 ? (
              <div className="py-8 space-y-6">
                {PROVISION_STEPS.map((step, i) => (
                  <div key={step.key} className={`flex items-center gap-3 transition-opacity ${i <= provisionStep ? 'opacity-100' : 'opacity-30'}`}>
                    {i < provisionStep ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : i === provisionStep ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted" />
                    )}
                    <span className={`text-sm ${i <= provisionStep ? 'font-medium' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de la zona</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej: Zona Bogotá"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (auto-generado)</Label>
                  <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="zona-bogota" />
                  <p className="text-xs text-muted-foreground">Identificador URL único para la zona.</p>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  💡 La infraestructura se provisiona automáticamente al crear la zona.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newName.trim() || !newSlug.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Crear Zona
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Zones Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-center">Sedes</TableHead>
                  <TableHead className="text-center">Usuarios</TableHead>
                  <TableHead className="text-center">Eventos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!zones?.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay zonas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((z) => (
                    <TableRow key={z.id}>
                      <TableCell className="font-medium">{z.name}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{z.code}</code></TableCell>
                      <TableCell className="text-center">{z.sede_count}</TableCell>
                      <TableCell className="text-center">{z.user_count}</TableCell>
                      <TableCell className="text-center">{z.hackathon_count}</TableCell>
                      <TableCell>
                        <Badge variant={z.is_active ? 'default' : 'secondary'}>
                          {z.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(z)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailZoneId(z.id)} title="Ver sedes">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {z.is_active && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeactivateTarget(z)} title="Desactivar">
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Zona</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !editName.trim()}>
                {editMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar Zona</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas desactivar la zona “{deactivateTarget?.name}”? Las sedes y usuarios de esta zona perderán acceso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
