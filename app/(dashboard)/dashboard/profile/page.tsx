'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';

import { es, enUS } from 'date-fns/locale';
import { useTranslation } from '@/lib/i18n/context';

import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  User,
  Zap,
  Flame,
  Code2,
  Medal,
  Trophy,
  Star,
  Settings,
  TrendingUp,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import type { ProfileResponse, BadgeResponse, ChallengeBreakdown, PointTransaction } from '@/types/api';

// ─── Chart Colors ────────────────────────────────────────

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#E7B200', '#6366f1', '#ec4899'];

// ─── Focus Icons Helper ──────────────────────────────────
function Target(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

// ─── Mesh Gradient SubComponent ──────────────────────────
function ActivityCoverMesh() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .activity-cover-mesh {
            background: linear-gradient(135deg, hsl(var(--primary)/0.65) 0%, hsl(var(--secondary)/0.8) 100%);
            position: relative;
        }
        .activity-cover-mesh::after {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            opacity: 0.15;
            pointer-events: none;
        }
      `}} />
      <div className="h-44 w-full rounded-3xl activity-cover-mesh overflow-hidden shadow-xl border border-border/10">
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
      </div>
    </>
  );
}

// ─── Profile Header Grid ─────────────────────────────────

function ProfileIdentity({
  profile,
  loading,
}: {
  profile: ProfileResponse | undefined;
  loading: boolean;
}) {
  const user = useAuthStore((s) => s?.user);
  const currentSede = useAuthStore((s) => s?.currentSede);
  const currentRole = useAuthStore((s) => s?.currentRole);


  const { t } = useTranslation();

  const initials = (user?.full_name ?? '')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="relative">
      {/* Activity Cover */}
      <ActivityCoverMesh />

      {/* Profile Info Overlay */}
      <div className="relative -mt-16 px-6 flex flex-col items-center text-center">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full border-4 border-background overflow-hidden shadow-2xl bg-card flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
            <span className="text-4xl font-bold text-primary">{initials || '?'}</span>
          </div>
          {currentRole && (
            <span className="absolute bottom-1 right-1 bg-secondary text-secondary-foreground text-[10px] font-bold px-3 py-1 rounded-full shadow-lg border-2 border-background uppercase tracking-widest">

              {t(`roles.${currentRole}`)}

            </span>
          )}
        </div>
        
        <div className="mt-4 space-y-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">

            {user?.full_name ?? t('roles.user')}

          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            {user?.email ?? ''}
          </p>
          {currentSede && (
            <div className="flex items-center justify-center gap-1.5 text-secondary pt-1">
              <MapPin className="text-sm w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">{currentSede.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Shortcut relative to container */}
      <div className="absolute top-4 right-4">
        <Link href="/dashboard/profile/settings">
          <Button variant="secondary" size="icon" className="rounded-full shadow-md bg-background/50 backdrop-blur-md hover:bg-background/80 transition-colors">
            <Settings className="w-5 h-5 text-foreground" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

function ProfileBentoStats({ profile, loading }: { profile: ProfileResponse | undefined, loading: boolean }) {
  const { t } = useTranslation();
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
      {[
        { label: t('dashboard.totalPoints'), value: profile?.total_points ?? 0, icon: Zap, color: 'text-primary' },
        { label: t('dashboard.currentStreak'), value: t('dashboard.days', { count: profile?.current_streak_days ?? 0 }), icon: Flame, color: 'text-secondary' },
        { label: t('dashboard.challengesSolved'), value: profile?.challenges_solved ?? 0, icon: Code2, color: 'text-accent' },
        { label: t('dashboard.campusRank'), value: profile?.sede_rank != null ? `#${profile.sede_rank}` : '—', icon: Trophy, color: 'text-unad-gold' },

      ].map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-card hover:bg-card/80 transition-colors p-5 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-sm border border-border/40">
            <Icon className={`w-7 h-7 ${stat.color} drop-shadow-sm`} />
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-12" /> : stat.value}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {stat.label}
            </span>
          </div>
        );
      })}
    </section>
  );
}

// ─── Badges Grid ─────────────────────────────────────────

function BadgesGrid({ badges, loading }: { badges: BadgeResponse[]; loading: boolean }) {

  const { t, locale } = useTranslation();
  const dfLocale = locale === 'es' ? es : enUS;
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
      </div>
    );
  }

  if (!badges?.length) {
    return (
      <div className="bg-card/40 rounded-3xl p-10 flex flex-col items-center text-center space-y-6 border border-dashed border-border/50">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center shadow-inner">
          <Medal className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <div className="space-y-2">

          <p className="font-semibold text-foreground text-lg">{t('dashboard.noBadges')}</p>
          <p className="text-sm text-muted-foreground leading-relaxed px-4 max-w-sm">
            {t('dashboard.noBadgesDescription')}

          </p>
        </div>
        <Link href="/dashboard/challenges">
          <Button className="rounded-full shadow-lg font-bold px-8" size="lg">

            {t('dashboard.hero.viewChallenges')}

          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {badges.map((badge) => (
        <div
          key={badge.badge_id}
          className="relative flex flex-col items-center justify-center p-6 rounded-3xl border border-border/40 bg-card hover:bg-muted/30 transition-all shadow-[0_4px_16px_-4px_rgba(0,0,0,0.05)] cursor-default group"
        >
          <div className="w-14 h-14 rounded-full bg-unad-gold/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
            <Star className="w-7 h-7 text-unad-gold drop-shadow-sm" />
          </div>
          <p className="text-sm font-bold text-center leading-tight mb-1.5">{badge.badge_name}</p>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
            {format(new Date(badge.awarded_at), "d MMM yyyy", { locale: dfLocale })}

          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Charts ──────────────────────────────────────────────

function CategoryDonutChart({ categories }: { categories: ChallengeBreakdown[] }) {

  const { t } = useTranslation();
  if (!categories?.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground font-medium">
        {t('dashboard.analytics.collecting')}
      </div>
    );
  }
  const data = categories.map((c) => ({ name: c.category, value: c.count }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={4}>
          {data.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.1)' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: '10px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function PointsBarChart({ transactions }: { transactions: PointTransaction[] }) {
  const { t } = useTranslation();
  const data = useMemo(() => {
    if (!transactions?.length) return [];
    const grouped: Record<string, number> = {};
    for (const tx of transactions) {
      const day = format(new Date(tx.created_at), 'dd/MM');
      grouped[day] = (grouped[day] ?? 0) + tx.points;
    }
    return Object.entries(grouped).slice(-7).map(([day, points]) => ({ day, points }));
  }, [transactions]);

  if (!data.length) {
    return <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground font-medium">{t('dashboard.analytics.collecting')}</div>;

  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} dy={8} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} dx={-8} />
        <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.1)' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />

        <Bar dataKey="points" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t('dashboard.history.table.points')} />

      </BarChart>
    </ResponsiveContainer>
  );
}

function CategoryRadarChart({ categories }: { categories: ChallengeBreakdown[] }) {

  const { t } = useTranslation();
  if (!categories?.length) {
    return <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground font-medium">{t('dashboard.analytics.collecting')}</div>;

  }
  const data = categories.map((c) => ({
    category: c.category.length > 12 ? c.category.slice(0, 12) + '…' : c.category,
    count: c.count,
    fullMark: Math.max(...categories.map((x) => x.count), 5),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} />
        <PolarRadiusAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} />
        <Radar name={t('nav.challenges')} dataKey="count" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.35} />
        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Transaction History ─────────────────────────────────

function TransactionHistory({ transactions, loading }: { transactions: PointTransaction[]; loading: boolean }) {

  const { t, locale } = useTranslation();
  const dfLocale = locale === 'es' ? es : enUS;

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>;
  }

  if (!transactions?.length) {
    return <EmptyState icon={TrendingUp} title={t('dashboard.history.empty')} description={t('dashboard.history.emptyDescription')} className="py-8 bg-card/20 border-dashed rounded-3xl border-border/50" />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/40 bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            <th className="text-left py-3 px-5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t('dashboard.history.table.detail')}</th>
            <th className="text-left py-3 px-5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t('dashboard.history.table.date')}</th>
            <th className="text-right py-3 px-5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t('dashboard.history.table.points')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors">
              <td className="py-3.5 px-5 font-semibold capitalize flex items-center gap-2 text-foreground">
                <div className={`w-2 h-2 rounded-full ${tx.points > 0 ? 'bg-primary' : 'bg-destructive'}`} />
                {tx.reason?.replace(/_/g, ' ') ?? '—'}
              </td>
              <td className="py-3.5 px-5 text-muted-foreground text-xs font-medium">
                {format(new Date(tx.created_at), "d MMM yyyy, HH:mm", { locale: dfLocale })}
              </td>
              <td className="py-3.5 px-5 text-right">
                <Badge variant={tx.points > 0 ? 'default' : 'destructive'} className="font-bold py-0.5 px-2">
                  {tx.points > 0 ? '+' : ''}{tx.points}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Profile Page Main Context ───────────────────────────

export default function ProfilePage() {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useProfile();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 animate-fade-in pb-12">
      
      {/* Visual Identity Section */}
      <ProfileIdentity profile={profile} loading={isLoading} />

      {/* Bento Grid Stats */}
      <ProfileBentoStats profile={profile} loading={isLoading} />

      {/* Badges Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold tracking-tight">{t('dashboard.badges', { count: profile?.badge_count ?? 0 })}</h3>
          <Link href="/dashboard/challenges" className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
            <ArrowRight className="w-5 h-5 pointer-events-none" />
          </Link>
        </div>
        <BadgesGrid badges={profile?.badges ?? []} loading={isLoading} />
      </section>

      {/* Analytics Section */}
      <section className="space-y-6">
        <div>
           <h3 className="text-xl font-extrabold tracking-tight">{t('dashboard.analytics.title')}</h3>
           <p className="text-sm text-muted-foreground mt-1 font-medium">{t('dashboard.analytics.subtitle')}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="min-w-0 overflow-hidden border-border/40 rounded-3xl shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardHeader className="pb-1 pt-6 px-6">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                 <Code2 className="w-4 h-4 text-primary" /> {t('dashboard.analytics.distribution')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2">
              <CategoryDonutChart categories={profile?.challenges_by_category ?? []} />
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden border-border/40 rounded-3xl shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardHeader className="pb-1 pt-6 px-6">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-secondary" /> {t('dashboard.analytics.recentPoints')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2">
              <PointsBarChart transactions={profile?.recent_transactions ?? []} />
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden border-border/40 rounded-3xl shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardHeader className="pb-1 pt-6 px-6">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                 <Target className="w-4 h-4 text-accent" /> {t('dashboard.analytics.skills')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2">
              <CategoryRadarChart categories={profile?.challenges_by_category ?? []} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Transaction History Section */}
      <section className="space-y-5">
         <div>
           <h3 className="text-xl font-extrabold tracking-tight">{t('dashboard.history.title')}</h3>
        </div>
        <TransactionHistory
          transactions={profile?.recent_transactions ?? []}
          loading={isLoading}
        />
      </section>
    </div>
  );
}
