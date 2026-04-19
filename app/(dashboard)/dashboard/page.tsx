'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useProfile } from '@/hooks/use-profile';
import { useActiveHackathons, useOpenHackathons } from '@/hooks/use-hackathons';
import { useNotifications } from '@/hooks/use-notifications';
import { useTranslation } from '@/lib/i18n/context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardPathForRole } from '@/lib/auth-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardHero } from '@/components/dashboard/dashboard-hero';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
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

const STATUS_CONFIG: Record<string, { labelKey: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { labelKey: 'status.active', variant: 'default' },
  registration_open: { labelKey: 'status.registrationOpen', variant: 'secondary' },
  paused: { labelKey: 'status.paused', variant: 'outline' },
  finished: { labelKey: 'status.finished', variant: 'destructive' },
  draft: { labelKey: 'status.draft', variant: 'outline' },
};

function HackathonStatusBadge({ status }: { status: HackathonStatus }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status] ?? { labelKey: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{t(cfg.labelKey)}</Badge>;
}

// ─── Hackathon Card ──────────────────────────────────────

function HackathonCard({ hackathon }: { hackathon: Hackathon }) {
  const { t, locale } = useTranslation();
  const dfLocale = locale === 'es' ? es : enUS;
  const isActive = hackathon.status === 'active';
  const isOpen = hackathon.status === 'registration_open';

  return (
    <div className="rounded-xl border border-border/50 p-3.5 transition-colors hover:bg-muted/40 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start gap-2">
            <h4 className="min-w-0 flex-1 text-sm font-semibold leading-5 text-foreground sm:text-base">
              {hackathon.name}
            </h4>
            <HackathonStatusBadge status={hackathon.status} />
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            {hackathon.is_team_based ? (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 shrink-0" /> {t('common.teams')}
              </span>
            ) : null}
            {hackathon.ends_at ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="leading-5">
                  {t('dashboard.endsAt', {
                    time: formatDistanceToNow(new Date(hackathon.ends_at), { addSuffix: true, locale: dfLocale }),
                  })}
                </span>
              </span>
            ) : null}
          </div>
        </div>
        <Link href={`/dashboard/hackathons/${hackathon.id}`} className="sm:shrink-0">
          <Button
            size="sm"
            variant={isActive ? 'default' : isOpen ? 'secondary' : 'outline'}
            className="h-10 w-full px-4 text-sm font-semibold sm:w-auto"
          >
            {isActive ? t('common.view') : isOpen ? t('dashboard.enroll') : t('common.details')}
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
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
  const { locale } = useTranslation();
  const dfLocale = locale === 'es' ? es : enUS;
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
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: dfLocale })}
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
  const router = useRouter();
  const user = useAuthStore((s) => s?.user);
  const role = useAuthStore((s) => s?.currentRole);
  const { t, locale } = useTranslation();

  // Role Guard: Redirect non-students
  useEffect(() => {
    if (user && role && role !== 'student' && role !== 'guest') {
      router.replace(getDashboardPathForRole(role));
    }
  }, [user, role, router]);

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: activeHackathons, isLoading: hackathonsLoading } = useActiveHackathons();
  const { data: openHackathons } = useOpenHackathons();
  const { data: notifications, isLoading: notificationsLoading } = useNotifications({ limit: 8 });

  const safeActiveHackathons = Array.isArray(activeHackathons) ? activeHackathons : [];
  const safeOpenHackathons = Array.isArray(openHackathons) ? openHackathons : [];

  const allHackathons = [
    ...safeActiveHackathons,
    ...safeOpenHackathons,
  ].filter(
    (h, i, arr) => arr.findIndex((x) => x.id === h.id) === i
  ).slice(0, 6);

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardHero 
        user={user} 
        profile={profile || null} 
        activeHackathons={safeActiveHackathons} 
        loading={profileLoading || hackathonsLoading} 
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={t('dashboard.totalPoints')}
          value={profile?.total_points ?? 0}
          icon={Zap}
          color="text-primary"
          bg="bg-primary/10"
          loading={profileLoading}
        />
        <MetricCard
          label={t('dashboard.currentStreak')}
          value={t('dashboard.days', { count: profile?.current_streak_days ?? 0 })}
          icon={Flame}
          color="text-accent"
          bg="bg-accent/10"
          subtitle={profile?.longest_streak_days ? t('dashboard.record', { count: profile.longest_streak_days }) : undefined}
          loading={profileLoading}
        />
        <MetricCard
          label={t('dashboard.challengesSolved')}
          value={profile?.challenges_solved ?? 0}
          icon={Code2}
          color="text-secondary"
          bg="bg-secondary/10"
          loading={profileLoading}
        />
        <MetricCard
          label={t('dashboard.campusRank')}
          value={profile?.sede_rank != null ? `#${profile.sede_rank}` : t('common.na')}
          icon={Medal}
          color="text-unad-gold"
          bg="bg-unad-gold/10"
          subtitle={profile?.hackathons_participated ? t('dashboard.hackathonsParticipated', { count: profile.hackathons_participated }) : undefined}
          loading={profileLoading}
        />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Left: Hackathons */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  {t('nav.hackathons')}
                </CardTitle>
                <Link href="/dashboard/hackathons">
                  <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs">
                    {t('common.viewAll')} <ArrowRight className="w-3 h-3 ml-1" />
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
                  title={t('dashboard.noActiveHackathons')}
                  description={t('dashboard.noActiveHackathonsDescription')}
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
                  {t('dashboard.recentPoints')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profile?.recent_transactions?.slice(0, 5)?.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm capitalize">{tx.reason?.replace(/_/g, ' ') ?? ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: locale === 'es' ? es : enUS })}
                        </p>
                      </div>
                      <Badge variant={tx.points > 0 ? 'default' : 'destructive'} className="shrink-0">
                        {tx.points > 0 ? '+' : ''}{tx.points} {t('common.points')}
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
          {/* 
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-accent" />
                  {t('dashboard.recentActivity')}
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
                  title={t('dashboard.noNotifications')}
                  description={t('dashboard.noNotificationsDescription')}
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>
          */}

          {/* Badges Preview */}
          {(profile?.badges?.length ?? 0) > 0 ? (
            <Card className="border-border/50 mt-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-unad-gold" />
                  {t('dashboard.badges', { count: profile?.badge_count ?? 0 })}
                </CardTitle>
                <Link href="/dashboard/profile">
                  <Button variant="ghost" size="sm" className="text-xs">
                    {t('dashboard.viewProfile')} <ArrowRight className="w-3 h-3 ml-1" />
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
                    <Badge variant="outline" className="text-xs">
                      +{(profile?.badge_count ?? 0) - 6} {t('common.more')}
                    </Badge>
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
