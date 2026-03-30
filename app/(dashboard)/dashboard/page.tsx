'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useProfile } from '@/hooks/use-profile';
import { useActiveHackathons, useOpenHackathons } from '@/hooks/use-hackathons';
import { useNotifications } from '@/hooks/use-notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Zap,
  Trophy,
  Code2,
  Medal,
  Flame,
  TrendingUp,
  Calendar,
  ArrowRight,
  Bell,
  Clock,
  Users,
  Star,
  ChevronRight,
} from 'lucide-react';
import type { Hackathon, Notification as ApiNotification, HackathonStatus } from '@/types/api';

// ─── Metric Card ─────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  subtitle,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
            {subtitle ? (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            ) : null}
          </div>
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Hackathon Status Badge ──────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'En curso', variant: 'default' },
  registration_open: { label: 'Inscripciones', variant: 'secondary' },
  paused: { label: 'Pausado', variant: 'outline' },
  finished: { label: 'Finalizado', variant: 'destructive' },
  draft: { label: 'Borrador', variant: 'outline' },
};

function HackathonStatusBadge({ status }: { status: HackathonStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── Hackathon Card ──────────────────────────────────────

function HackathonCard({ hackathon }: { hackathon: Hackathon }) {
  const isActive = hackathon.status === 'active';
  const isOpen = hackathon.status === 'registration_open';

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium truncate">{hackathon.name}</h4>
          <HackathonStatusBadge status={hackathon.status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {hackathon.is_team_based ? (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> Equipos
            </span>
          ) : null}
          {hackathon.ends_at ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Finaliza {formatDistanceToNow(new Date(hackathon.ends_at), { addSuffix: true, locale: es })}
            </span>
          ) : null}
        </div>
      </div>
      <Link href={`/dashboard/hackathons/${hackathon.id}`}>
        <Button size="sm" variant={isActive ? 'default' : isOpen ? 'secondary' : 'outline'}>
          {isActive ? 'Ver' : isOpen ? 'Inscribirse' : 'Detalles'}
          <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Activity Item ───────────────────────────────────────

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  badge_earned: Star,
  hackathon_start: Trophy,
  hackathon_end: Trophy,
  team_invite: Users,
  submission_result: Code2,
  hint_available: Zap,
};

function ActivityItem({ notification }: { notification: ApiNotification }) {
  const Icon = NOTIFICATION_ICONS[notification.type] ?? Bell;
  return (
    <div className="flex gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{notification.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>
      {!notification.is_read ? (
        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
      ) : null}
    </div>
  );
}

// ─── Dashboard Page ──────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s?.user);
  const currentSede = useAuthStore((s) => s?.currentSede);

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: activeHackathons, isLoading: hackathonsLoading } = useActiveHackathons();
  const { data: openHackathons } = useOpenHackathons();
  const { data: notifications, isLoading: notificationsLoading } = useNotifications({ limit: 8 });

  const allHackathons = [
    ...(activeHackathons ?? []),
    ...(openHackathons ?? []),
  ].filter(
    (h, i, arr) => arr.findIndex((x) => x.id === h.id) === i
  ).slice(0, 6);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`¡Hola, ${user?.full_name?.split?.(' ')?.[0] ?? 'usuario'}!`}
        description={`Panel de ${currentSede?.name ?? 'sede'}. Aquí tienes un resumen de tu actividad.`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Puntos totales"
          value={profile?.total_points ?? 0}
          icon={Zap}
          color="text-primary"
          bg="bg-primary/10"
          loading={profileLoading}
        />
        <MetricCard
          label="Racha actual"
          value={`${profile?.current_streak_days ?? 0} días`}
          icon={Flame}
          color="text-accent"
          bg="bg-accent/10"
          subtitle={profile?.longest_streak_days ? `Récord: ${profile.longest_streak_days} días` : undefined}
          loading={profileLoading}
        />
        <MetricCard
          label="Retos resueltos"
          value={profile?.challenges_solved ?? 0}
          icon={Code2}
          color="text-secondary"
          bg="bg-secondary/10"
          loading={profileLoading}
        />
        <MetricCard
          label="Ranking sede"
          value={profile?.sede_rank != null ? `#${profile.sede_rank}` : '—'}
          icon={Medal}
          color="text-unad-gold"
          bg="bg-unad-gold/10"
          subtitle={profile?.hackathons_participated ? `${profile.hackathons_participated} hackathones` : undefined}
          loading={profileLoading}
        />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Hackathons */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  Hackathones
                </CardTitle>
                <Link href="/dashboard/hackathons">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver todos <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {hackathonsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : allHackathons.length > 0 ? (
                allHackathons.map((h) => <HackathonCard key={h.id} hackathon={h} />)
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="Sin hackathones activos"
                  description="No hay hackathones en curso o con inscripciones abiertas por ahora."
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>

          {/* Recent Points */}
          {(profile?.recent_transactions?.length ?? 0) > 0 ? (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  Últimos puntos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profile?.recent_transactions?.slice(0, 5)?.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm capitalize">{tx.reason?.replace(/_/g, ' ') ?? ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      <Badge variant={tx.points > 0 ? 'default' : 'destructive'} className="shrink-0">
                        {tx.points > 0 ? '+' : ''}{tx.points} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right: Activity Feed */}
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-accent" />
                  Actividad reciente
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (notifications?.length ?? 0) > 0 ? (
                <div className="divide-y divide-border/30">
                  {notifications?.map((n) => (
                    <ActivityItem key={n.id} notification={n} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Bell}
                  title="Sin notificaciones"
                  description="Tu actividad reciente aparecerá aquí."
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>

          {/* Badges Preview */}
          {(profile?.badges?.length ?? 0) > 0 ? (
            <Card className="border-border/50 mt-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="w-4 h-4 text-unad-gold" />
                    Insignias ({profile?.badge_count ?? 0})
                  </CardTitle>
                  <Link href="/dashboard/profile">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Ver perfil <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile?.badges?.slice(0, 6)?.map((b) => (
                    <Badge key={b.badge_id} variant="secondary" className="text-xs">
                      <Star className="w-3 h-3 mr-1 text-unad-gold" />
                      {b.badge_name}
                    </Badge>
                  ))}
                  {(profile?.badge_count ?? 0) > 6 ? (
                    <Badge variant="outline" className="text-xs">+{(profile?.badge_count ?? 0) - 6} más</Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
