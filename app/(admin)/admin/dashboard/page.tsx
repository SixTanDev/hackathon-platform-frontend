'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n/context';
import { queryKeys } from '@/lib/query-client';
import {
  getSedeOverviewAnalytics,
  getHealth,
  getAuditLog,
  getChallengeReviews,
} from '@/lib/api/admin-services';
import type {
  SedeOverviewAnalytics,
  HealthCheck,
  AuditLogEntry,
  ChallengeReview,
} from '@/lib/api/admin-services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Trophy,
  CheckCircle2,
  Code2,
  Brain,
  Percent,
  Server,
  ScrollText,
  AlertTriangle,
  Clock,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { t, locale } = useTranslation();
  const currentSede = useAuthStore((s) => s?.currentSede);
  const sedeId = currentSede?.id ?? '';

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: queryKeys.admin.sedeOverview(sedeId),
    queryFn: () => getSedeOverviewAnalytics(),
    enabled: !!sedeId,
  });

  const { data: health, isLoading: loadingHealth } = useQuery({
    queryKey: queryKeys.admin.health,
    queryFn: () => getHealth(),
    refetchInterval: 60_000,
  });

  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: queryKeys.admin.auditLog({ page: 1, page_size: 8 }),
    queryFn: () => getAuditLog({ page: 1, page_size: 8 }),
    enabled: !!sedeId,
  });

  const { data: pendingReviews } = useQuery({
    queryKey: queryKeys.admin.challengeReviews({ status: 'pending' }),
    queryFn: () => getChallengeReviews({ status: 'pending' }),
    enabled: !!sedeId,
  });

  const auditEntries = auditData?.items ?? [];
  const pendingCount = pendingReviews?.length ?? 0;
  const loading = loadingOverview;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('admin.hero.title')}
        description={t('admin.hero.subtitle', { sede: currentSede?.name ?? t('common.campus') })}
      />

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label={t('admin.metrics.usersTotal')}
            value={overview?.users_total ?? 0}
            icon={Users}
            color="text-primary"
            bg="bg-primary/10"
            sub={overview?.users_by_role ? Object.entries(overview.users_by_role).map(([r, c]) => `${r}: ${c}`).join(' · ') : undefined}
          />
          <StatCard
            label={t('tutor.dashboard.activeHackathons')}
            value={overview?.hackathons_active ?? 0}
            icon={Trophy}
            color="text-unad-gold"
            bg="bg-unad-gold/10"
            sub={`${overview?.hackathons_completed ?? 0} ${t('admin.metrics.completed')} · ${overview?.hackathons_total ?? 0} ${t('admin.metrics.total')}`}
          />
          <StatCard
            label={t('admin.metrics.challengesTotal')}
            value={overview?.challenges_total ?? 0}
            icon={Code2}
            color="text-accent"
            bg="bg-accent/10"
            sub={overview?.challenges_by_difficulty ? Object.entries(overview.challenges_by_difficulty).map(([d, c]) => `${d}: ${c}`).join(' · ') : undefined}
          />
          <StatCard
            label={t('admin.metrics.aiInteractions')}
            value={overview?.ai_interactions_total ?? 0}
            icon={Brain}
            color="text-secondary"
            bg="bg-secondary/10"
            sub={`~${(overview?.ai_interactions_avg_per_student ?? 0).toFixed(1)} ${t('admin.metrics.perStudent')}`}
          />
          <StatCard
            label={t('admin.metrics.resolutionRate')}
            value={`${((overview?.average_resolution_rate ?? 0) * 100).toFixed(0)}%`}
            icon={Percent}
            color="text-green-400"
            bg="bg-green-500/10"
          />
          <StatCard
            label={t('tutor.dashboard.pendingReviews')}
            value={pendingCount}
            icon={ShieldCheck}
            color={pendingCount > 0 ? 'text-unad-orange' : 'text-muted-foreground'}
            bg={pendingCount > 0 ? 'bg-unad-orange/10' : 'bg-muted/10'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Health */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              {t('admin.infra.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : health ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('admin.infra.status.general')}:</span>
                  <Badge
                    variant="outline"
                    className={health.status === 'healthy' || health.status === 'ok'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }
                  >
                    {health.status}
                  </Badge>
                </div>

                {health.checks && Object.entries(health.checks).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">{t('admin.infra.services')}:</p>
                    {Object.entries(health.checks).map(([name, info]) => (
                      <div key={name} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{name.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          {info.latency_ms != null && <span className="text-muted-foreground">{info.latency_ms}ms</span>}
                          <Badge variant="outline" className={`text-[10px] ${
                            info.status === 'healthy' || info.status === 'ok' || info.status === 'connected'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {info.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {health.services && Object.entries(health.services).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">{t('admin.infra.externalServices')}:</p>
                    {Object.entries(health.services).map(([name, info]) => (
                      <div key={name} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{name.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className={`text-[10px] ${
                            info.status === 'healthy' || info.status === 'ok' || info.status === 'connected'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {info.status}
                          </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {health.server?.uptime != null && (
                  <p className="text-[11px] text-muted-foreground">
                    {t('admin.infra.uptime')}: {Math.floor(health.server.uptime / 3600)}h {Math.floor((health.server.uptime % 3600) / 60)}m
                    {health.server.version && ` · v${health.server.version}`}
                  </p>
                )}

                {!health.checks && !health.services && (
                  <p className="text-sm text-muted-foreground">{t('admin.infra.noSystems')}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('admin.infra.error')}</p>
            )}
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-secondary" />
              {t('admin.activity.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAudit ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : auditEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.activity.noData')}</p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/20">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {entry.user_name ?? entry.user_email ?? (entry.user_id ? entry.user_id.slice(0, 8) : 'Sistema')}
                      </p>
                      <p className="text-muted-foreground">
                        {entry.action}
                        {entry.entity_type && ` — ${entry.entity_type}`}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: locale === 'es' ? es : enUS })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Top Topics */}
      {overview?.ai_top_topics && overview.ai_top_topics.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-secondary" />
              {t('admin.aiTopics.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {overview.ai_top_topics.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {t.topic} <span className="ml-1 text-muted-foreground">({t.count})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
