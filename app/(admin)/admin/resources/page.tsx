'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listResourceRequests, createResourceRequest } from '@/lib/api/admin-services';
import type { ResourceRequest, ResourceRequestCreate } from '@/lib/api/admin-services';
import { queryKeys } from '@/lib/query-client';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Loader2,
  ClipboardList,
  Calendar,
  Users,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', color: 'bg-unad-gold/10 text-unad-gold border-unad-gold/20', icon: <Clock className="w-3 h-3" /> },
  approved: { label: 'Aprobado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
  scheduled: { label: 'Programado', color: 'bg-secondary/10 text-secondary border-secondary/20', icon: <Calendar className="w-3 h-3" /> },
  completed: { label: 'Completado', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Rechazado', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <XCircle className="w-3 h-3" /> },
};

const INTENSITIES: { value: 'low' | 'medium' | 'high'; label: string }[] = [
  { value: 'low', label: 'Baja — Uso ligero' },
  { value: 'medium', label: 'Media — Uso moderado' },
  { value: 'high', label: 'Alta — Uso intensivo' },
];

export default function ResourceRequestPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [expectedStudents, setExpectedStudents] = useState(50);
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium');

  const { data: requests, isLoading } = useQuery({
    queryKey: queryKeys.admin.resourceRequests,
    queryFn: listResourceRequests,
  });

  const createMut = useMutation({
    mutationFn: (p: ResourceRequestCreate) => createResourceRequest(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.resourceRequests });
      resetForm();
      toast({ title: 'Solicitud enviada', description: 'Tu solicitud de recursos ha sido registrada.' });
    },
    onError: () => toast({ title: 'Error', description: 'No se pudo enviar la solicitud.', variant: 'destructive' }),
  });

  const resetForm = () => {
    setShowCreate(false);
    setEventName('');
    setEventDate('');
    setExpectedStudents(50);
    setIntensity('medium');
  };

  // Status flow visualization
  const statusFlow = ['pending', 'approved', 'scheduled', 'completed'];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Solicitudes de Recursos"
        description="Solicita recursos adicionales para eventos y hackathones"
      >
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Solicitar Recursos Extra
        </Button>
      </PageHeader>

      {/* Status flow explanation */}
      <Card className="border-border/50">
        <CardContent className="py-3">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {statusFlow.map((s, i) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${cfg.color} gap-1`}>
                    {cfg.icon}
                    {cfg.label}
                  </Badge>
                  {i < statusFlow.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estudiantes</TableHead>
                <TableHead>Intensidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Aprobado por</TableHead>
                <TableHead>Informe</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !requests || requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No hay solicitudes de recursos.</p>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => {
                  const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.event_name}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(r.event_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-xs">{r.expected_students}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{r.expected_intensity}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${cfg.color} gap-1`}>
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(r.approved_by_user_id as string) ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(r.review_notes as string) ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => !v && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Recursos Extra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre del evento *</Label>
              <Input placeholder="Ej: Hackathon Regional de IA" value={eventName} onChange={(e) => setEventName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha del evento *</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estudiantes esperados</Label>
              <Input type="number" min={1} value={expectedStudents} onChange={(e) => setExpectedStudents(Number(e.target.value) || 50)} />
            </div>
            <div className="space-y-2">
              <Label>Intensidad esperada</Label>
              <Select value={intensity} onValueChange={(v) => setIntensity(v as 'low' | 'medium' | 'high')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTENSITIES.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button
              onClick={() => createMut.mutate({
                event_name: eventName.trim(),
                event_date: eventDate,
                expected_students: expectedStudents,
                expected_intensity: intensity,
              })}
              disabled={!eventName.trim() || !eventDate || createMut.isPending}
            >
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Enviar Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
