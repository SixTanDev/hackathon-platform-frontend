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
    <div className="group relative flex flex-col p-4 rounded-2xl border border-border/40 bg-card/20 hover:bg-card/40 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      
      {/* Top Row: Status & Badge */}
      <div className="flex items-center justify-between mb-3">
        <HackathonStatusBadge status={hackathon.status} />
        {hackathon.ends_at && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            <Clock className="w-3 h-3 opacity-70" /> 
            <span>
              {formatDistanceToNow(new Date(hackathon.ends_at), { addSuffix: true, locale: dfLocale })}
            </span>
          </div>
        )}
      </div>

      {/* Middle: Title & Meta */}
      <div className="space-y-1 mb-4 flex-1">
        <h4 className="text-base font-black text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
          {hackathon.name}
        </h4>
        
        <div className="flex items-center gap-2">
          {hackathon.is_team_based ? (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded-md">
              <Users className="w-3 h-3 opacity-70" /> 
              <span>{t('common.teams')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded-md">
              <Code2 className="w-3 h-3 opacity-70" /> 
              <span>{t('hackathons.card.individual')}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded-md uppercase tracking-wider">
            {hackathon.scope || 'Campus'}
          </div>
        </div>
      </div>

      {/* Bottom: Action */}
      <div className="pt-3 border-t border-border/20">
        <Link href={`/dashboard/hackathons/${hackathon.id}`} className="block">
          <Button
            size="sm"
            variant={isActive ? 'default' : 'secondary'}
            className={`w-full h-10 text-xs font-bold transition-all ${isActive ? 'shadow-md shadow-primary/20' : 'hover:bg-primary/5'}`}
          >
            {isActive ? t('dashboard.hero.continue') : isOpen ? t('dashboard.enroll') : t('common.details')}
            <ChevronRight className="ml-1 w-3.5 h-3.5" />
          </Button>
        </Link>
      </div> 
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


  const safeActiveHackathons = Array.isArray(activeHackathons) ? activeHackathons : [];
  const safeOpenHackathons = Array.isArray(openHackathons) ? openHackathons : [];

  const allHackathons = [
    ...safeActiveHackathons,
    ...safeOpenHackathons,
  ].filter(
    (h, i, arr) => arr.findIndex((x) => x.id === h.id) === i
  ).slice(0, 6);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
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
          value={profile?.sede_rank != null ? `#${profile.sede_rank}` : t('dashboard.rankUnranked')}
          icon={Medal}
          color="text-unad-gold"
          bg="bg-unad-gold/10"
          subtitle={profile?.hackathons_participated ? t('dashboard.hackathonsParticipated', { count: profile.hackathons_participated }) : t('dashboard.rankJoinToStart')}
          loading={profileLoading}
        />
      </div>
      {/* Main Content Sections */}
      <div className="space-y-10">
        {/* Full-Width Hackathons Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-black flex items-center gap-2.5 text-foreground tracking-tight">
              <Trophy className="w-5 h-5 text-primary" />
              {t('nav.hackathons')}
            </h3>
            <Link href="/dashboard/hackathons">
              <Button variant="ghost" size="sm" className="text-xs font-bold hover:bg-primary/5 hover:text-primary transition-all">
                {t('common.viewAll')} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          {hackathonsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-44 w-full rounded-2xl" />
              ))}
            </div>
          ) : allHackathons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allHackathons.map((h) => <HackathonCard key={h.id} hackathon={h} />)}
            </div>
          ) : (
            <Card className="border-border/40 bg-card/10 backdrop-blur-sm">
              <CardContent className="py-16">
                <EmptyState
                  icon={Calendar}
                  title={t('dashboard.noActiveHackathons')}
                  description={t('dashboard.noActiveHackathonsDescription')}
                />
              </CardContent>
            </Card>
          )}
        </section>

        {/* Bottom Grid: Points & Badges */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Points */}
          {(profile?.recent_transactions?.length ?? 0) > 0 ? (
            <Card className="border-border/40 bg-card/10 backdrop-blur-sm shadow-sm">
              <CardHeader className="pb-3 border-b border-border/10 mb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  {t('dashboard.recentPoints')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {profile?.recent_transactions?.slice(0, 5)?.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border/10 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground/90 capitalize">{tx.reason?.replace(/_/g, ' ') ?? ''}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-1 opacity-70">
                          {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: locale === 'es' ? es : enUS })}
                        </p>
                      </div>
                      <Badge variant={tx.points > 0 ? 'default' : 'destructive'} className="shrink-0 font-black shadow-sm h-7 px-3">
                        {tx.points > 0 ? '+' : ''}{tx.points}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
          {/* Badges Preview */}
          {(profile?.badges?.length ?? 0) > 0 ? (
            <Card className="border-border/40 bg-card/10 backdrop-blur-sm shadow-sm">
              <CardHeader className="pb-3 border-b border-border/10 mb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2.5">
                    <Star className="w-4 h-4 text-unad-gold" />
                    {t('dashboard.badges', { count: profile?.badge_count ?? 0 })}
                  </CardTitle>
                  <Link href="/dashboard/profile">
                    <Button variant="ghost" size="sm" className="text-xs font-bold hover:text-primary">
                      {t('dashboard.viewProfile')} <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {profile?.badges?.slice(0, 10)?.map((b) => (
                    <Badge key={b.badge_id} variant="secondary" className="px-3 py-1.5 bg-muted/40 border-border/50 text-xs font-bold transition-all hover:bg-muted/60 hover:scale-105">
                      <Star className="w-3.5 h-3.5 mr-2 text-unad-gold fill-unad-gold/20" />
                      {b.badge_name}
                    </Badge>
                  ))}
                  {(profile?.badge_count ?? 0) > 10 ? (
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 border-dashed">
                      +{(profile?.badge_count ?? 0) - 10} {t('common.more')}
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
