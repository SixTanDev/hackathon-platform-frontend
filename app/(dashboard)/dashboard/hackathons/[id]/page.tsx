'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useCountdown } from '@/hooks/use-countdown';
import { useToast } from '@/hooks/use-toast';
import {
  getHackathon,
  getHackathonChallenges,
  getHackathonRegistrations,
  registerForHackathon,
  cancelRegistration,
  getHackathonLeaderboard,
  getHackathonTeams,
  createTeam,
  getTeamDetail,
  getTeamProgress,
  getTeamMessages,
  sendTeamMessage,
  inviteToTeam,
  type HackathonChallengeWithDetail,
  type TeamMessage,
  type TeamProgressEntry,
} from '@/lib/api/hackathon-services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Trophy,
  Calendar,
  Clock,
  Users,
  Radio,
  Gamepad2,
  Zap,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Code2,
  FileText,
  BarChart3,
  ScrollText,
  User as UserIcon,
  Medal,
  Loader2,
  Plus,
  Send,
  Crown,
  Shield,
  XCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import type {
  Hackathon,
  Registration,
  Team,
  LeaderboardEntry,
  HackathonMode,
  HackathonScope,
  ChallengeDifficulty,
} from '@/types/api';

// ─── Difficulty Config ───────────────────────────────────

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  easy: { label: 'Fácil', color: 'bg-green-500/10 text-green-500' },
  medium: { label: 'Medio', color: 'bg-amber-500/10 text-amber-500' },
  hard: { label: 'Difícil', color: 'bg-orange-500/10 text-orange-500' },
  expert: { label: 'Experto', color: 'bg-red-500/10 text-red-500' },
};

// ─── Countdown Display ──────────────────────────────────

function CountdownDisplay({ label, targetDate }: { label: string; targetDate: string | null }) {
  const countdown = useCountdown(targetDate);
  if (!targetDate || countdown.isExpired) return null;

  return (

    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm">
      <Clock className="w-4 h-4 animate-pulse text-amber-600 dark:text-amber-400" />
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-mono font-bold tracking-tight text-amber-700 dark:text-amber-300">{countdown.formatted}</span>

    </div>
  );
}

// ─── Hero Section ───────────────────────────────────────

function HeroSection({
  hackathon,
  isEnrolled,
  myRegistration,
  onRegister,
  onCancel,
  isRegistering,
  isCancelling,
}: {
  hackathon: Hackathon;
  isEnrolled: boolean;
  myRegistration: Registration | null;
  onRegister: () => void;
  onCancel: () => void;
  isRegistering: boolean;
  isCancelling: boolean;
}) {
  const scopeLabels: Record<HackathonScope, string> = {
    internal: 'Interno',
    zonal: 'Zonal',
    open: 'Abierto',
  };

  const modeLabels: Record<HackathonMode, { label: string; icon: React.ElementType }> = {
    live: { label: 'En Vivo', icon: Radio },
    practice: { label: 'Práctica', icon: Gamepad2 },
  };

  const ModeIcon = modeLabels[hackathon.mode]?.icon ?? Radio;


  const now = useMemo(() => new Date(), []);
  const regStartsAt = hackathon.registration_starts_at ? new Date(hackathon.registration_starts_at) : null;
  const regEndsAt = hackathon.registration_ends_at ? new Date(hackathon.registration_ends_at) : null;
  
  const isWindowClosed = regEndsAt ? now > regEndsAt : false;
  const isWindowNotOpenYet = regStartsAt ? now < regStartsAt : false;
  
  const isRegOpen = hackathon.status === 'registration_open' && !isWindowClosed && !isWindowNotOpenYet;

  const isActive = hackathon.status === 'active';

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="h-16 bg-gradient-to-r from-primary via-secondary to-accent relative">
        <div className="absolute inset-0 bg-black/20" />
      </div>
      <CardContent className="-mt-6 relative space-y-4 pb-6">
        {/* Title + Badges */}
        <div className="pt-8">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">{scopeLabels[hackathon.scope]}</Badge>
            <Badge className={`text-xs ${hackathon.mode === 'live' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'} border-0`}>
              <ModeIcon className="w-3 h-3 mr-1" />
              {modeLabels[hackathon.mode]?.label}
            </Badge>

            {hackathon.status === 'registration_open' && isWindowClosed && (
              <Badge variant="destructive" className="text-xs opacity-80">Registro cerrado</Badge>
            )}
            {hackathon.status === 'registration_open' && isWindowNotOpenYet && (
              <Badge variant="secondary" className="text-xs">Registro próximamente</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{hackathon.name}</h1>
          {hackathon.description ? (
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{hackathon.description}</p>
          ) : null}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Inicio</p>
            <p className="font-medium">
              {hackathon.starts_at
                ? format(new Date(hackathon.starts_at), "d MMM yyyy, HH:mm", { locale: es })
                : 'Sin definir'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Fin</p>
            <p className="font-medium">
              {hackathon.ends_at
                ? format(new Date(hackathon.ends_at), "d MMM yyyy, HH:mm", { locale: es })
                : 'Sin límite'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Modalidad</p>
            <p className="font-medium">{hackathon.is_team_based ? `Equipos (${hackathon.min_team_size ?? 2}-${hackathon.max_team_size})` : 'Individual'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Penalización pistas</p>
            <p className="font-medium">{hackathon.hint_penalty_percent}%</p>
          </div>
        </div>

        {/* Countdown */}
        {isActive && hackathon.ends_at ? (
          <CountdownDisplay label="Tiempo restante:" targetDate={hackathon.ends_at} />
        ) : null}

        {hackathon.status === 'registration_open' && isWindowNotOpenYet && regStartsAt ? (
          <CountdownDisplay label="Registro abre en:" targetDate={hackathon.registration_starts_at} />
        ) : null}
        {hackathon.status === 'registration_open' && !isWindowClosed && !isWindowNotOpenYet && hackathon.starts_at ? (

          <CountdownDisplay label="Comienza en:" targetDate={hackathon.starts_at} />
        ) : null}

        {/* Action Buttons */}

        <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center">

          {isRegOpen && !isEnrolled ? (
            <Button onClick={onRegister} disabled={isRegistering}>
              {isRegistering ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
              Inscribirse
            </Button>
          ) : hackathon.status === 'registration_open' && isWindowClosed && !isEnrolled ? (
            <Button disabled variant="outline" className="opacity-70">
              <XCircle className="w-4 h-4 mr-1" /> Registro cerrado
            </Button>
          ) : hackathon.status === 'registration_open' && isWindowNotOpenYet && !isEnrolled ? (
            <Button disabled variant="outline" className="opacity-70">
              <Clock className="w-4 h-4 mr-1" /> Próximamente
            </Button>

          ) : null}
          {isEnrolled ? (
            <>
              <Badge variant="secondary" className="px-3 py-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" /> Inscrito
              </Badge>
              {isRegOpen ? (
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={isCancelling} className="text-destructive">
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancelar inscripción'}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Challenges Tab ─────────────────────────────────────

function ChallengesTab({
  hackathonId,
  challenges,
  isLoading,
}: {
  hackathonId: string;
  challenges: HackathonChallengeWithDetail[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  if (!challenges?.length) {
    return (
      <EmptyState
        icon={Code2}
        title="Sin retos asignados"
        description="Aún no se han asignado retos a este hackathon."
      />
    );
  }

  const sorted = [...challenges].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div className="space-y-2">
      {sorted.map((hc, idx) => {
        const c = hc.challenge;
        const diff = DIFFICULTY_CONFIG[c?.difficulty ?? ''] ?? DIFFICULTY_CONFIG.medium;
        const isCoding = c?.type === 'coding';
        const isFlash = hc.is_flash;

        return (
          <Link
            key={hc.id}
            href={`/dashboard/hackathons/${hackathonId}/challenges/${hc.challenge_id}`}
          >
            <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/40 ${
              isFlash ? 'border-accent/50 bg-accent/5' : 'border-border/50'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-muted-foreground font-mono w-6 shrink-0">#{idx + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c?.title ?? `Reto ${hc.challenge_id.slice(0, 8)}`}</p>
                    {isFlash ? (
                      <Badge className="text-[10px] bg-accent/10 text-accent border-0">
                        <Zap className="w-3 h-3 mr-0.5" /> Flash ×{hc.flash_multiplier}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-[10px] ${diff.color} border-0`}>{diff.label}</Badge>
                    {c?.category ? (
                      <span className="text-[11px] text-muted-foreground">{c.category}</span>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground">
                      {hc.points_override ?? c?.points_base ?? 0} pts
                    </span>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0">
                {isCoding ? 'Resolver' : 'Ver Reto'} <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Leaderboard Tab ────────────────────────────────────

function LeaderboardTab({
  hackathonId,
  isTeamBased,
}: {
  hackathonId: string;
  isTeamBased: boolean;
}) {
  const userId = useAuthStore((s) => s?.user?.id);
  const [type, setType] = useState<'individual' | 'team'>('individual');

  const { data: entries, isLoading } = useQuery({
    queryKey: queryKeys.hackathons.leaderboard(hackathonId),
    queryFn: () => getHackathonLeaderboard(hackathonId, type),
    refetchInterval: 30 * 1000,
  });

  const RANK_COLORS = ['', 'text-yellow-500', 'text-gray-400', 'text-amber-700'];
  const RANK_ICONS = [null, Crown, Medal, Medal];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isTeamBased ? (
        <div className="flex gap-2">
          <Button size="sm" variant={type === 'individual' ? 'default' : 'outline'} onClick={() => setType('individual')}>
            <UserIcon className="w-3 h-3 mr-1" /> Individual
          </Button>
          <Button size="sm" variant={type === 'team' ? 'default' : 'outline'} onClick={() => setType('team')}>
            <Users className="w-3 h-3 mr-1" /> Equipos
          </Button>
        </div>
      ) : null}

      {!entries?.length ? (
        <EmptyState
          icon={BarChart3}
          title="Sin datos aún"
          description="La tabla de posiciones se actualizará cuando haya participación."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground w-12">#</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Nombre</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Puntos</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Resueltos</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Pistas</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isMe = entry.user_global_id === userId;
                const RankIcon = entry.rank <= 3 ? RANK_ICONS[entry.rank] : null;

                return (
                  <tr
                    key={`${entry.rank}-${entry.user_global_id ?? entry.team_id}`}
                    className={`border-b border-border/30 last:border-0 ${
                      isMe ? 'bg-primary/5' : 'hover:bg-muted/30'
                    }`}
                  >
                    <td className="py-2.5 px-2">
                      <span className={`font-bold ${RANK_COLORS[entry.rank] ?? ''}`}>
                        {RankIcon ? (
                          <span className="flex items-center gap-1">
                            {(() => { const I = RankIcon; return <I className="w-4 h-4" />; })()}
                            {entry.rank}
                          </span>
                        ) : entry.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={isMe ? 'font-semibold text-primary' : ''}>
                        {entry.display_name ?? 'Anónimo'}
                        {isMe ? ' (tú)' : ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold">{entry.score}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground hidden sm:table-cell">
                      {entry.submissions_passed ?? 0}
                    </td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground hidden md:table-cell">
                      {entry.hints_used ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Team Tab ───────────────────────────────────────────

function TeamTab({
  hackathonId,
  myRegistration,
  onRegisterWithTeam,
}: {
  hackathonId: string;
  myRegistration: Registration | null;
  onRegisterWithTeam: (teamId: string) => void;
}) {
  const userId = useAuthStore((s) => s?.user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [messageText, setMessageText] = useState('');

  const myTeamId = myRegistration?.team_id;

  // All teams
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: queryKeys.hackathons.teams(hackathonId),
    queryFn: () => getHackathonTeams(hackathonId),
  });

  // My team detail
  const { data: myTeam } = useQuery({
    queryKey: queryKeys.teams.detail(myTeamId ?? ''),
    queryFn: () => getTeamDetail(myTeamId!),
    enabled: !!myTeamId,
  });

  // Team messages (poll every 10s)
  const { data: messages } = useQuery({
    queryKey: queryKeys.teams.messages(myTeamId ?? ''),
    queryFn: () => getTeamMessages(myTeamId!),
    enabled: !!myTeamId,
    refetchInterval: 10 * 1000,
  });

  // Team progress
  const { data: progress } = useQuery({
    queryKey: queryKeys.teams.progress(myTeamId ?? ''),
    queryFn: () => getTeamProgress(myTeamId!),
    enabled: !!myTeamId,
  });

  // Create team mutation
  const createMutation = useMutation({
    mutationFn: (name: string) => createTeam(hackathonId, { name }),
    onSuccess: (team) => {
      toast({ title: 'Equipo creado', description: `"${team.name}" creado exitosamente.` });
      queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.teams(hackathonId) });
      setShowCreateDialog(false);
      setTeamName('');
      onRegisterWithTeam(team.id);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo crear el equipo.', variant: 'destructive' });
    },
  });

  // Send message mutation
  const sendMsgMutation = useMutation({
    mutationFn: (content: string) => sendTeamMessage(myTeamId!, content),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.messages(myTeamId ?? '') });
    },
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: (email: string) => inviteToTeam(myTeamId!, { email }),
    onSuccess: () => {
      toast({ title: 'Invitación enviada' });
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(myTeamId ?? '') });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo enviar la invitación.', variant: 'destructive' });
    },
  });

  // ─── No Team Yet ───
  if (!myTeamId) {
    const openTeams = teams?.filter((t) => {
      const accepted = t.members?.filter((m) => m.status === 'accepted')?.length ?? 0;
      return t.status !== 'disbanded' && accepted < t.max_size;
    }) ?? [];

    return (
      <div className="space-y-6">
        <div className="flex gap-3">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> Crear Equipo
          </Button>
        </div>

        {/* Available Teams */}
        <div>
          <h3 className="text-sm font-medium mb-3">Equipos con cupo disponible</h3>
          {teamsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : openTeams.length > 0 ? (
            <div className="space-y-2">
              {openTeams.map((team) => {
                const memberCount = team.members?.filter((m) => m.status === 'accepted')?.length ?? 0;
                return (
                  <div key={team.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {memberCount}/{team.max_size} miembros
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRegisterWithTeam(team.id)}
                    >
                      Unirse
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No hay equipos disponibles"
              description="Crea un equipo para comenzar."
              className="py-6"
            />
          )}
        </div>

        {/* Create Team Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear equipo</DialogTitle>
              <DialogDescription>Ingresa el nombre de tu equipo para empezar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="team-name">Nombre del equipo</Label>
              <Input
                id="team-name"
                placeholder="Los Programadores"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate(teamName)}
                disabled={!teamName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── Has Team ───
  return (
    <div className="space-y-6">
      {/* Team Info */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {myTeam?.name ?? 'Mi Equipo'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {myTeam?.members?.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  {m.role === 'leader' ? <Crown className="w-3 h-3 text-unad-gold" /> : <UserIcon className="w-3 h-3 text-muted-foreground" />}
                  <span className="text-sm">{m.user_global_id.slice(0, 8)}</span>
                  {m.user_global_id === userId ? <Badge variant="secondary" className="text-[10px]">Tú</Badge> : null}
                </div>
                <Badge variant={m.status === 'accepted' ? 'secondary' : 'outline'} className="text-[10px] capitalize">
                  {m.status === 'accepted' ? 'Activo' : m.status === 'invited' ? 'Pendiente' : m.status}
                </Badge>
              </div>
            ))}
          </div>

          {/* Invite Form */}
          <Separator className="my-3" />
          <div className="flex gap-2">
            <Input
              placeholder="Email del compañero"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={() => inviteMutation.mutate(inviteEmail)}
              disabled={!inviteEmail.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full Team Page Link */}
      <div className="flex gap-2">
        <Link href={`/dashboard/teams/${myTeamId}`}>
          <Button variant="outline" size="sm">
            <Users className="w-4 h-4 mr-1" /> Ver equipo completo
          </Button>
        </Link>
        <Link href={`/dashboard/teams/${myTeamId}/progress`}>
          <Button variant="outline" size="sm">
            <TrendingUp className="w-4 h-4 mr-1" /> Progreso detallado
          </Button>
        </Link>
      </div>

      {/* Team Progress */}
      {(progress?.length ?? 0) > 0 ? (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Progreso del equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {progress?.map((p) => (
                <div key={p.user_global_id} className="flex items-center justify-between text-sm">
                  <span>{p.display_name ?? p.user_global_id.slice(0, 8)}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{p.challenges_solved} retos</span>
                    <Badge variant="secondary" className="text-[10px]">{p.total_points} pts</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Team Chat */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="w-3 h-3" /> Chat del equipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 overflow-y-auto space-y-2 mb-3 border border-border/30 rounded-lg p-3">
            {!messages?.length ? (
              <p className="text-xs text-muted-foreground text-center py-8">No hay mensajes aún. ¡Empieza la conversación!</p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.user_global_id === userId;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-1.5 text-xs ${
                      isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {!isOwn ? <p className="font-medium mb-0.5 text-[10px]">{msg.sender_name ?? msg.user_global_id.slice(0, 8)}</p> : null}
                      <p>{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && messageText.trim()) {
                  sendMsgMutation.mutate(messageText.trim());
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => sendMsgMutation.mutate(messageText.trim())}
              disabled={!messageText.trim() || sendMsgMutation.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Rules Tab ──────────────────────────────────────────

function RulesTab({ hackathon }: { hackathon: Hackathon }) {
  return (
    <div className="space-y-6">
      {/* Rules */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reglas del hackathon</CardTitle>
        </CardHeader>
        <CardContent>
          {hackathon.rules_text ? (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {hackathon.rules_text}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No se han definido reglas específicas para este hackathon.</p>
          )}
        </CardContent>
      </Card>

      {/* Scoring Info */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sistema de puntuación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="font-medium mb-1">Penalización por pistas</p>
              <p className="text-muted-foreground">
                Cada pista utilizada reduce el puntaje del reto en un <span className="font-bold text-accent">{hackathon.hint_penalty_percent}%</span>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="font-medium mb-1">Modalidad</p>
              <p className="text-muted-foreground">
                {hackathon.is_team_based
                  ? `Equipos de ${hackathon.min_team_size ?? 2} a ${hackathon.max_team_size} miembros.${hackathon.allow_individual ? ' También se permite participación individual.' : ''}`
                  : 'Participación individual.'}
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="font-medium mb-1">Modo</p>
            <p className="text-muted-foreground">
              {hackathon.mode === 'live'
                ? 'Este hackathon es en vivo. Los retos deben resolverse dentro del tiempo límite.'
                : 'Modo práctica. Puedes resolver los retos a tu propio ritmo.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────

export default function HackathonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const hackathonId = params?.id as string;
  const userId = useAuthStore((s) => s?.user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showSuccessDialog, setShowSuccessDialog] = useState(false);


  // Fetch hackathon
  const { data: hackathon, isLoading: hackathonLoading } = useQuery({
    queryKey: queryKeys.hackathons.detail(hackathonId),
    queryFn: () => getHackathon(hackathonId),
    enabled: !!hackathonId,
  });

  // Fetch challenges
  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: queryKeys.hackathons.challenges(hackathonId),
    queryFn: () => getHackathonChallenges(hackathonId),
    enabled: !!hackathonId,
  });


  // Auth & Role
  const { enrolledHackathonIds, addEnrolledHackathon, currentRole } = useAuthStore();
  const isStudent = currentRole === 'student';

  // Fetch registrations (Disabled for students to avoid 403)
  const { data: registrations } = useQuery({
    queryKey: queryKeys.hackathons.registrations(hackathonId),
    queryFn: () => getHackathonRegistrations(hackathonId),
    enabled: !!hackathonId && !isStudent,

  });

  const myRegistration = registrations?.find(
    (r) => r.user_global_id === userId && r.status !== 'cancelled'
  ) ?? null;


  // For students, we rely on local persistence since we can't fetch the list
  const isEnrolled = isStudent 
    ? enrolledHackathonIds.includes(hackathonId) 
    : !!myRegistration;


  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (teamId?: string | null) => registerForHackathon(hackathonId, teamId),
    onSuccess: () => {
      if (isStudent) {
        addEnrolledHackathon(hackathonId);
        setShowSuccessDialog(true);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.registrations(hackathonId) });
        toast({ title: '¡Inscripción exitosa!', description: 'Ya estás inscrito en este hackathon.' });
      }

    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.detail ?? 'No se pudo completar la inscripción.', variant: 'destructive' });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () => cancelRegistration(hackathonId),
    onSuccess: () => {
      toast({ title: 'Inscripción cancelada' });
      queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.registrations(hackathonId) });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo cancelar la inscripción.', variant: 'destructive' });
    },
  });

  const handleRegister = useCallback(() => {
    registerMutation.mutate(null);
  }, [registerMutation]);

  const handleRegisterWithTeam = useCallback((teamId: string) => {
    registerMutation.mutate(teamId);
  }, [registerMutation]);

  const handleCancel = useCallback(() => {
    cancelMutation.mutate();
  }, [cancelMutation]);

  if (hackathonLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Hackathon no encontrado"
        description="El hackathon que buscas no existe o no tienes acceso."
      >
        <Button variant="outline" onClick={() => router.push('/dashboard/hackathons')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver a hackathones
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Link */}
      <Link href="/dashboard/hackathons">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Hackathones
        </Button>
      </Link>

      {/* Hero */}
      <HeroSection
        hackathon={hackathon}
        isEnrolled={isEnrolled}
        myRegistration={myRegistration}
        onRegister={handleRegister}
        onCancel={handleCancel}
        isRegistering={registerMutation.isPending}
        isCancelling={cancelMutation.isPending}
      />

      {/* Content Tabs */}
      <Tabs defaultValue="challenges">
        <TabsList>
          <TabsTrigger value="challenges" className="gap-1">
            <Code2 className="w-3 h-3" /> Retos
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1">
            <BarChart3 className="w-3 h-3" /> Tabla de Posiciones
          </TabsTrigger>
          {hackathon.is_team_based ? (
            <TabsTrigger value="team" className="gap-1">
              <Users className="w-3 h-3" /> Mi Equipo
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="rules" className="gap-1">
            <ScrollText className="w-3 h-3" /> Reglas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="mt-4">
          <ChallengesTab
            hackathonId={hackathonId}
            challenges={challenges ?? []}
            isLoading={challengesLoading}
          />
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <LeaderboardTab
            hackathonId={hackathonId}
            isTeamBased={hackathon.is_team_based}
          />
        </TabsContent>

        {hackathon.is_team_based ? (
          <TabsContent value="team" className="mt-4">
            <TeamTab
              hackathonId={hackathonId}
              myRegistration={myRegistration}
              onRegisterWithTeam={handleRegisterWithTeam}
            />
          </TabsContent>
        ) : null}

        <TabsContent value="rules" className="mt-4">
          <RulesTab hackathon={hackathon} />
        </TabsContent>
      </Tabs>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md border-none p-0 overflow-hidden bg-background/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="h-2 bg-green-500" />
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-bold tracking-tight text-center">¡Inscripción Exitosa!</DialogTitle>
              <DialogDescription className="text-muted-foreground text-center">
                Te has inscrito correctamente en <span className="font-semibold text-foreground">{hackathon?.name}</span>. 
                Estás listo para demostrar tu talento.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2 pt-2">
              {hackathon?.is_team_based ? (
                <Button 
                  onClick={() => setShowSuccessDialog(false)} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
                >
                  <Users className="w-4 h-4 mr-2" /> Gestionar mi equipo
                </Button>
              ) : (
                <Button 
                  onClick={() => setShowSuccessDialog(false)} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
                >
                  <Code2 className="w-4 h-4 mr-2" /> Ver desafíos
                </Button>
              )}
              <Button variant="ghost" onClick={() => setShowSuccessDialog(false)} className="w-full">
                Cerrar
              </Button>
            </div>
          </div>
          <div className="px-6 py-4 bg-muted/30 flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 text-unad-gold" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-center">
              ¡Mucha suerte en la competencia!
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
