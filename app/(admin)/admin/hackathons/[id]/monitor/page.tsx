'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getHackathon } from '@/lib/api/hackathon-services';
import {
  getMonitorStats,
  getChallengeLibrary,
  createFlashChallenge,
  type MonitorStats,
  type CreateFlashChallengePayload,
  type RegistrationEntry,
  type HackathonMentor,
} from '@/lib/api/admin-hackathon-services';
import type { HackathonChallenge } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Users,
  Zap,
  Loader2,
  Activity,
  Wifi,
  WifiOff,
  BookOpen,
  UserCheck,
} from 'lucide-react';
import type { ChallengePublic } from '@/types/api';

export default function MonitorDashboard() {
  const { id: hackathonId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hackathon } = useQuery({
    queryKey: queryKeys.hackathons.detail(hackathonId),
    queryFn: () => getHackathon(hackathonId),
    enabled: !!hackathonId,
  });

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: queryKeys.adminHackathons.monitor(hackathonId),
    queryFn: () => getMonitorStats(hackathonId),
    enabled: !!hackathonId,
    refetchInterval: 15 * 1000,
  });

  const isConnected = !isError && !!stats;
  const monitor: MonitorStats | null = stats ?? null;

  // Flash challenge state
  const [flashOpen, setFlashOpen] = useState(false);
  const [flashChallengeId, setFlashChallengeId] = useState('');
  const [flashDuration, setFlashDuration] = useState(30);
  const [flashMultiplier, setFlashMultiplier] = useState(2);

  const { data: challengeLib } = useQuery({
    queryKey: queryKeys.challenges.library({ limit: 100 } as Record<string, unknown>),
    queryFn: () => getChallengeLibrary({ limit: 100 }),
    enabled: flashOpen,
  });

  const flashMut = useMutation({
    mutationFn: (payload: CreateFlashChallengePayload) => createFlashChallenge(hackathonId, payload),
    onSuccess: () => {
      toast({ title: '¡Reto Relámpago lanzado!', description: 'Los participantes han sido notificados.' });
      setFlashOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.adminHackathons.monitor(hackathonId) });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo crear el reto relámpago.', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/hackathons/${hackathonId}/edit`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-500" />
              Monitor en Vivo
            </h1>
            <p className="text-sm text-muted-foreground">{hackathon?.name ?? 'Hackathon'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            {isConnected ? (
              <><Wifi className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500">Conectado</span></>
            ) : (
              <><WifiOff className="w-3.5 h-3.5 text-destructive" /><span className="text-destructive">Desconectado</span></>
            )}
          </div>
          <Button onClick={() => setFlashOpen(true)} className="gap-1.5 bg-accent hover:bg-accent/90">
            <Zap className="w-4 h-4" /> Reto Relámpago
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
          <Skeleton className="h-64 col-span-full" />
        </div>
      ) : !monitor ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No se pudieron cargar las estadísticas del monitor. Asegúrate de que el hackathon esté activo.</CardContent></Card>
      ) : (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Inscritos</p>
                    <p className="text-3xl font-bold">{monitor.total_enrolled}</p>
                    <p className="text-[10px] text-muted-foreground">registros totales</p>
                  </div>
                  <Users className="w-8 h-8 text-primary/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Retos Asignados</p>
                    <p className="text-3xl font-bold">{monitor.total_challenges}</p>
                    <p className="text-[10px] text-muted-foreground">en este hackathon</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-secondary/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Mentores</p>
                    <p className="text-3xl font-bold">{monitor.mentors.length}</p>
                    <p className="text-[10px] text-muted-foreground">asignados</p>
                  </div>
                  <UserCheck className="w-8 h-8 text-unad-gold/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Challenges List */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Retos del Hackathon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {monitor.challenges.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin retos asignados</p>
                ) : (
                  monitor.challenges.map((ch: HackathonChallenge) => (
                    <div key={ch.id} className="flex items-center justify-between p-2 rounded bg-muted/20">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{ch.order_index + 1}</span>
                        <span className="text-sm truncate">{ch.challenge_id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ch.is_flash && <Badge variant="secondary" className="text-[10px] bg-accent/20 text-accent"><Zap className="w-3 h-3 mr-0.5" />Flash</Badge>}
                        {ch.points_override && <span className="text-xs font-mono">{ch.points_override} pts</span>}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Registrations */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Participantes Inscritos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {monitor.registrations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin inscripciones aún</p>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-1">
                    {monitor.registrations.map((reg: RegistrationEntry) => (
                      <div key={reg.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{reg.user_global_id.slice(0, 12)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{reg.status}</Badge>
                          {reg.team_id && <span className="text-[10px] text-muted-foreground">Equipo</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mentors List */}
            <Card className="border-border/50 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-unad-gold" /> Mentores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monitor.mentors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin mentores asignados</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {monitor.mentors.map((m: HackathonMentor) => (
                      <div key={m.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                        <UserCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{m.full_name ?? m.user_global_id.slice(0, 12)}</p>
                          <p className="text-[10px] text-muted-foreground">{m.role_in_hackathon}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Flash Challenge Dialog */}
      <Dialog open={flashOpen} onOpenChange={setFlashOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              Crear Reto Relámpago
            </DialogTitle>
            <DialogDescription>Lanza un reto con tiempo límite y multiplicador de puntos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Seleccionar reto</Label>
              <Select value={flashChallengeId} onValueChange={setFlashChallengeId}>
                <SelectTrigger><SelectValue placeholder="Elige un reto..." /></SelectTrigger>
                <SelectContent>
                  {(challengeLib ?? []).map((ch: ChallengePublic) => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duración: {flashDuration} minutos</Label>
              <Slider value={[flashDuration]} onValueChange={([v]) => setFlashDuration(v)} min={15} max={60} step={5} />
            </div>
            <div className="space-y-2">
              <Label>Multiplicador de puntos</Label>
              <div className="flex gap-2">
                {[1.5, 2, 3].map((m) => (
                  <Button
                    key={m}
                    variant={flashMultiplier === m ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFlashMultiplier(m)}
                    className={flashMultiplier === m ? 'bg-accent hover:bg-accent/90' : ''}
                  >
                    ×{m}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlashOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => flashMut.mutate({ challenge_id: flashChallengeId, duration_minutes: flashDuration, points_multiplier: flashMultiplier })}
              disabled={!flashChallengeId || flashMut.isPending}
              className="bg-accent hover:bg-accent/90 gap-1.5"
            >
              {flashMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              ¡Lanzar!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
