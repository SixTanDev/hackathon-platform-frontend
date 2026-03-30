'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  User,
  Mail,
  Zap,
  Flame,
  Code2,
  Medal,
  Trophy,
  Star,
  Settings,
  Calendar,
  TrendingUp,
  Award,
} from 'lucide-react';
import type { ProfileResponse, BadgeResponse, ChallengeBreakdown, PointTransaction } from '@/types/api';

// ─── Chart Colors ────────────────────────────────────────

const CHART_COLORS = ['#004669', '#248F8B', '#F47920', '#E7B200', '#6366f1', '#ec4899'];

// ─── Profile Header Card ─────────────────────────────────

function ProfileHeader({
  profile,
  loading,
}: {
  profile: ProfileResponse | undefined;
  loading: boolean;
}) {
  const user = useAuthStore((s) => s?.user);
  const currentSede = useAuthStore((s) => s?.currentSede);
  const currentRole = useAuthStore((s) => s?.currentRole);

  const initials = (user?.full_name ?? '')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="border-border/50 overflow-hidden">
      {/* Gradient Banner */}
      <div className="h-24 bg-gradient-to-r from-primary via-secondary to-accent relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
      </div>
      <CardContent className="-mt-12 relative pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-xl bg-background border-4 border-background shadow-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{initials || '?'}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{user?.full_name ?? 'Usuario'}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {user?.email ?? ''}
              </span>
              {currentSede ? (
                <span className="flex items-center gap-1">
                  <Medal className="w-3.5 h-3.5" /> {currentSede.name}
                </span>
              ) : null}
              {currentRole ? (
                <Badge variant="secondary" className="text-xs capitalize">{currentRole}</Badge>
              ) : null}
            </div>
          </div>

          {/* Settings link */}
          <Link href="/dashboard/profile/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" /> Configuración
            </Button>
          </Link>
        </div>

        {/* Quick Stats Row */}
        <Separator className="my-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Puntos', value: profile?.total_points ?? 0, icon: Zap, color: 'text-primary' },
            { label: 'Racha', value: `${profile?.current_streak_days ?? 0}d`, icon: Flame, color: 'text-accent' },
            { label: 'Retos', value: profile?.challenges_solved ?? 0, icon: Code2, color: 'text-secondary' },
            { label: 'Ranking', value: profile?.sede_rank != null ? `#${profile.sede_rank}` : '—', icon: Trophy, color: 'text-unad-gold' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                {loading ? (
                  <Skeleton className="h-6 w-12 mx-auto" />
                ) : (
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Icon className="w-3 h-3" /> {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Badges Grid ─────────────────────────────────────────

function BadgesGrid({ badges, loading }: { badges: BadgeResponse[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  if (!badges?.length) {
    return (
      <EmptyState
        icon={Award}
        title="Sin insignias aún"
        description="Completa retos y participa en hackathones para ganar insignias."
        className="py-8"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {badges.map((badge) => (
        <div
          key={badge.badge_id}
          className="relative flex flex-col items-center justify-center p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-unad-gold/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Star className="w-5 h-5 text-unad-gold" />
          </div>
          <p className="text-xs font-medium text-center leading-tight">{badge.badge_name}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {format(new Date(badge.awarded_at), "d MMM yyyy", { locale: es })}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Category Donut Chart ────────────────────────────────

function CategoryDonutChart({ categories }: { categories: ChallengeBreakdown[] }) {
  if (!categories?.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        Sin datos de categorías
      </div>
    );
  }

  const data = categories.map((c) => ({ name: c.category, value: c.count }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Points Bar Chart ───────────────────────────────────

function PointsBarChart({ transactions }: { transactions: PointTransaction[] }) {
  // Group transactions by day (last 7 entries)
  const data = useMemo(() => {
    if (!transactions?.length) return [];

    const grouped: Record<string, number> = {};
    for (const tx of transactions) {
      const day = format(new Date(tx.created_at), 'dd/MM');
      grouped[day] = (grouped[day] ?? 0) + tx.points;
    }
    return Object.entries(grouped)
      .slice(-7)
      .map(([day, points]) => ({ day, points }));
  }, [transactions]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        Sin transacciones recientes
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
        />
        <Bar dataKey="points" fill="#248F8B" radius={[4, 4, 0, 0]} name="Puntos" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Category Radar Chart ────────────────────────────────

function CategoryRadarChart({ categories }: { categories: ChallengeBreakdown[] }) {
  if (!categories?.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        Sin datos de categorías
      </div>
    );
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
        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        <PolarRadiusAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
        <Radar name="Retos" dataKey="count" stroke="#F47920" fill="#F47920" fillOpacity={0.3} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Transaction History ─────────────────────────────────

function TransactionHistory({ transactions, loading }: { transactions: PointTransaction[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sin transacciones"
        description="Tus movimientos de puntos aparecerán aquí."
        className="py-6"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Razón</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Fecha</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Puntos</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
              <td className="py-2 px-2 capitalize">{tx.reason?.replace(/_/g, ' ') ?? '—'}</td>
              <td className="py-2 px-2 text-muted-foreground">
                {format(new Date(tx.created_at), "d MMM yyyy, HH:mm", { locale: es })}
              </td>
              <td className="py-2 px-2 text-right">
                <Badge variant={tx.points > 0 ? 'default' : 'destructive'} className="text-xs">
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

// ─── Profile Page ────────────────────────────────────────

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mi Perfil"
        description="Tu resumen de actividad, insignias y estadísticas."
      />

      {/* Header Card */}
      <ProfileHeader profile={profile} loading={isLoading} />

      {/* Badges */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-unad-gold" />
            Insignias ({profile?.badge_count ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BadgesGrid badges={profile?.badges ?? []} loading={isLoading} />
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Retos por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonutChart categories={profile?.challenges_by_category ?? []} />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Puntos recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <PointsBarChart transactions={profile?.recent_transactions ?? []} />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Habilidades</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryRadarChart categories={profile?.challenges_by_category ?? []} />
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-secondary" />
            Historial de puntos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionHistory
            transactions={profile?.recent_transactions ?? []}
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
