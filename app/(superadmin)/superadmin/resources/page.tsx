'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  listAllResourceRequests,
  approveResourceRequest,
  rejectResourceRequest,
  type SuperAdminResourceRequest,
  type ApproveResourcePayload,
} from '@/lib/api/superadmin-services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle, XCircle, Clock, Loader2, CalendarDays,
  Users as UsersIcon, Zap, FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
  approved: { label: 'Aprobado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  rejected: { label: 'Rechazado', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
  scheduled: { label: 'Programado', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  completed: { label: 'Completado', color: 'bg-green-500/10 text-green-500 border-green-500/30' },
};

const INTENSITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'text-green-500' },
  medium: { label: 'Media', color: 'text-yellow-500' },
  high: { label: 'Alta', color: 'text-orange-500' },
  extreme: { label: 'Extrema', color: 'text-red-500' },
};

export default function SuperAdminResourcesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('all');
  const [approveTarget, setApproveTarget] = useState<SuperAdminResourceRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SuperAdminResourceRequest | null>(null);

  // Approve form
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  // Reject form
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.superadmin.resourceRequests({ status: statusFilter !== 'all' ? statusFilter : undefined }),
    queryFn: () => listAllResourceRequests(statusFilter !== 'all' ? { status: statusFilter } : undefined),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApproveResourcePayload }) =>
      approveResourceRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'resource-requests'] });
      toast({ title: 'Solicitud aprobada' });
      setApproveTarget(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo aprobar la solicitud.', variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectResourceRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'resource-requests'] });
      toast({ title: 'Solicitud rechazada' });
      setRejectTarget(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo rechazar la solicitud.', variant: 'destructive' });
    },
  });

  const openApprove = (r: SuperAdminResourceRequest) => {
    setApproveTarget(r);
    // Pre-fill: 1 hour before event, 1 hour after
    try {
      const eventDate = new Date(r.event_date);
      const start = new Date(eventDate.getTime() - 60 * 60 * 1000);
      const end = new Date(eventDate.getTime() + 60 * 60 * 1000);
      setScheduledStart(format(start, "yyyy-MM-dd'T'HH:mm"));
      setScheduledEnd(format(end, "yyyy-MM-dd'T'HH:mm"));
    } catch {
      setScheduledStart('');
      setScheduledEnd('');
    }
    setApproveNotes('');
  };

  const handleApprove = () => {
    if (!approveTarget) return;
    approveMutation.mutate({
      id: approveTarget.id,
      payload: { scheduled_start: scheduledStart, scheduled_end: scheduledEnd, notes: approveNotes || undefined },
    });
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason });
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Solicitudes de Recursos"
        description="Aprueba o rechaza solicitudes de infraestructura de todas las sedes"
      />

      {/* Status Filter */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="approved">Aprobado</SelectItem>
            <SelectItem value="rejected">Rechazado</SelectItem>
            <SelectItem value="scheduled">Programado</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                  <TableHead>Sede</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-center">Estudiantes</TableHead>
                  <TableHead className="text-center">Intensidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!items.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay solicitudes
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => {
                    const statusInfo = STATUS_MAP[r.status] ?? STATUS_MAP.pending;
                    const intensityInfo = INTENSITY_MAP[r.intensity] ?? INTENSITY_MAP.medium;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{r.sede_name}</p>
                            <p className="text-xs text-muted-foreground">{r.zone_name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{r.event_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {format(new Date(r.event_date), 'dd MMM yyyy', { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 text-sm">
                            <UsersIcon className="h-3 w-3" />
                            {r.expected_students}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${intensityInfo.color}`}>
                            <Zap className="h-3 w-3 inline mr-1" />{intensityInfo.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-green-500 hover:text-green-600"
                                  onClick={() => openApprove(r)}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />Aprobar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-red-500 hover:text-red-600"
                                  onClick={() => { setRejectTarget(r); setRejectReason(''); }}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />Rechazar
                                </Button>
                              </>
                            )}
                            {r.status === 'completed' && r.cost_report_url && (
                              <a href={r.cost_report_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="text-xs">
                                  <FileText className="h-3.5 w-3.5 mr-1" />Reporte
                                </Button>
                              </a>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Aprobar Solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p><strong>{approveTarget?.event_name}</strong></p>
              <p className="text-muted-foreground">{approveTarget?.sede_name} • {approveTarget?.expected_students} estudiantes esperados</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inicio programado</Label>
                <Input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fin programado</Label>
                <Input type="datetime-local" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} placeholder="Notas adicionales..." rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancelar</Button>
              <Button
                onClick={handleApprove}
                disabled={!scheduledStart || !scheduledEnd || approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p><strong>{rejectTarget?.event_name}</strong></p>
              <p className="text-muted-foreground">{rejectTarget?.sede_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Motivo del rechazo</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explica el motivo del rechazo..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Rechazar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
