'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getHackathon } from '@/lib/api/hackathon-services';
import { updateHackathon, transitionHackathon } from '@/lib/api/admin-hackathon-services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
  ArrowLeft,
  Loader2,
  Save,
  Activity,
  Play,
  Pause,
  Square,
  Archive,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import type { Hackathon, HackathonStatus, HackathonUpdate, HackathonMode } from '@/types/api';
import Link from 'next/link';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  registration_open: { label: 'Inscripciones Abiertas', color: 'bg-unad-gold/10 text-unad-gold' },
  active: { label: 'Activo', color: 'bg-emerald-500/10 text-emerald-500' },
  paused: { label: 'Pausado', color: 'bg-amber-500/10 text-amber-500' },
  finished: { label: 'Finalizado', color: 'bg-primary/10 text-primary' },
  archived: { label: 'Archivado', color: 'bg-muted/50 text-muted-foreground/60' },
};

interface TransitionDef {
  label: string;
  target: HackathonStatus;
  icon: React.ElementType;
  variant: 'default' | 'outline' | 'destructive';
  confirm: string;
}

const TRANSITIONS: Record<string, TransitionDef[]> = {
  draft: [
    { label: 'Abrir Inscripciones', target: 'registration_open', icon: Play, variant: 'default', confirm: '¿Abrir inscripciones para este hackathon?' },
  ],
  registration_open: [
    { label: 'Iniciar Hackathon', target: 'active', icon: Play, variant: 'default', confirm: '¿Iniciar este hackathon? Los participantes podrán ver y resolver los retos.' },
  ],
  active: [
    { label: 'Pausar', target: 'paused', icon: Pause, variant: 'outline', confirm: '¿Pausar el hackathon? Los participantes no podrán enviar entregas.' },
    { label: 'Finalizar', target: 'finished', icon: Square, variant: 'destructive', confirm: '¿Finalizar el hackathon? Esta acción no se puede deshacer fácilmente.' },
  ],
  paused: [
    { label: 'Reanudar', target: 'active', icon: RotateCcw, variant: 'default', confirm: '¿Reanudar el hackathon?' },
  ],
  finished: [
    { label: 'Archivar', target: 'archived', icon: Archive, variant: 'outline', confirm: '¿Archivar el hackathon? Pasará a estado histórico.' },
  ],
};

function formatDateTime(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function EditHackathonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hackathon, isLoading } = useQuery({
    queryKey: queryKeys.hackathons.detail(id),
    queryFn: () => getHackathon(id),
    enabled: !!id,
  });

  // Edit form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [mode, setMode] = useState<HackathonMode>('live');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [regStartsAt, setRegStartsAt] = useState('');
  const [regEndsAt, setRegEndsAt] = useState('');
  const [isTeamBased, setIsTeamBased] = useState(false);
  const [minTeamSize, setMinTeamSize] = useState(2);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [allowIndividual, setAllowIndividual] = useState(true);
  const [hintPenalty, setHintPenalty] = useState(5);
  const [transitionConfirm, setTransitionConfirm] = useState<TransitionDef | null>(null);

  useEffect(() => {
    if (!hackathon) return;
    setName(hackathon.name);
    setDescription(hackathon.description ?? '');
    setRulesText(hackathon.rules_text ?? '');
    setMode(hackathon.mode);
    setStartsAt(formatDateTime(hackathon.starts_at));
    setEndsAt(formatDateTime(hackathon.ends_at));
    setRegStartsAt(formatDateTime(hackathon.registration_starts_at));
    setRegEndsAt(formatDateTime(hackathon.registration_ends_at));
    setIsTeamBased(hackathon.is_team_based);
    setMinTeamSize(hackathon.min_team_size ?? 2);
    setMaxTeamSize(hackathon.max_team_size);
    setAllowIndividual(hackathon.allow_individual);
    setHintPenalty(hackathon.hint_penalty_percent);
  }, [hackathon]);

  const updateMut = useMutation({
    mutationFn: (payload: HackathonUpdate) => updateHackathon(id, payload),
    onSuccess: () => {
      toast({ title: 'Hackathon actualizado' });
      queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.all });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo actualizar.', variant: 'destructive' });
    },
  });

  const transitionMut = useMutation({
    mutationFn: (target: HackathonStatus) => transitionHackathon(id, target),
    onSuccess: () => {
      toast({ title: 'Estado actualizado' });
      queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.all });
      setTransitionConfirm(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado.', variant: 'destructive' });
    },
  });

  function handleSave() {
    updateMut.mutate({
      name: name.trim() || null,
      description: description || null,
      rules_text: rulesText || null,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      registration_starts_at: regStartsAt || null,
      registration_ends_at: regEndsAt || null,
      is_team_based: isTeamBased,
      allow_individual: allowIndividual,
      min_team_size: isTeamBased ? minTeamSize : null,
      max_team_size: isTeamBased ? maxTeamSize : null,
      hint_penalty_percent: hintPenalty,
    });
  }

  if (isLoading) {
    return <div className="space-y-4 animate-fade-in"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!hackathon) {
    return <div className="text-center py-16 text-muted-foreground">Hackathon no encontrado</div>;
  }

  const statusCfg = STATUS_CONFIG[hackathon.status] ?? { label: hackathon.status, color: '' };
  const transitions = TRANSITIONS[hackathon.status] ?? [];
  const isEditable = hackathon.status === 'draft' || hackathon.status === 'registration_open';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/hackathons')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{hackathon.name}</h1>
              <Badge className={`${statusCfg.color} border-0`}>{statusCfg.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">ID: {hackathon.id.slice(0, 8)}...</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hackathon.status === 'active' && (
            <Link href={`/admin/hackathons/${id}/monitor`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Activity className="w-4 h-4" /> Monitorear
              </Button>
            </Link>
          )}
          {isEditable && (
            <Button onClick={handleSave} disabled={updateMut.isPending}>
              {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Guardar
            </Button>
          )}
        </div>
      </div>

      {/* State Transitions */}
      {transitions.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Transición de Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge className={`${statusCfg.color} border-0`}>{statusCfg.label}</Badge>
              <span className="text-muted-foreground">→</span>
              {transitions.map((t) => {
                const Icon = t.icon;
                return (
                  <Button
                    key={t.target}
                    variant={t.variant}
                    size="sm"
                    onClick={() => setTransitionConfirm(t)}
                    className="gap-1.5"
                  >
                    <Icon className="w-4 h-4" /> {t.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-base">Información General</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isEditable} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={!isEditable} />
            </div>
            <div className="space-y-2">
              <Label>Reglas</Label>
              <Textarea value={rulesText} onChange={(e) => setRulesText(e.target.value)} rows={3} disabled={!isEditable} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Alcance</Label>
                <p className="text-sm font-medium capitalize">{hackathon.scope}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Modo</Label>
                <p className="text-sm font-medium">{hackathon.mode === 'live' ? 'En Vivo' : 'Práctica'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-base">Fechas y Configuración</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Inicio evento</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} disabled={!isEditable} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fin evento</Label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} disabled={!isEditable} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Inicio inscripciones</Label>
                <Input type="datetime-local" value={regStartsAt} onChange={(e) => setRegStartsAt(e.target.value)} disabled={!isEditable} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fin inscripciones</Label>
                <Input type="datetime-local" value={regEndsAt} onChange={(e) => setRegEndsAt(e.target.value)} disabled={!isEditable} />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>¿Por equipos?</Label>
              <Switch checked={isTeamBased} onCheckedChange={setIsTeamBased} disabled={!isEditable} />
            </div>
            {isTeamBased && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Mín equipo</Label>
                  <Input type="number" value={minTeamSize} onChange={(e) => setMinTeamSize(Number(e.target.value))} disabled={!isEditable} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Máx equipo</Label>
                  <Input type="number" value={maxTeamSize} onChange={(e) => setMaxTeamSize(Number(e.target.value))} disabled={!isEditable} />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>¿Permitir individuales?</Label>
              <Switch checked={allowIndividual} onCheckedChange={setAllowIndividual} disabled={!isEditable} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Penalización pistas (%)</Label>
              <Input type="number" value={hintPenalty} onChange={(e) => setHintPenalty(Number(e.target.value))} disabled={!isEditable} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transition Confirm */}
      <AlertDialog open={!!transitionConfirm} onOpenChange={(o) => { if (!o) setTransitionConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar transición</AlertDialogTitle>
            <AlertDialogDescription>{transitionConfirm?.confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => transitionConfirm && transitionMut.mutate(transitionConfirm.target)} disabled={transitionMut.isPending}>
              {transitionMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
