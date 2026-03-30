'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { queryKeys } from '@/lib/query-client';
import {
  getSedeOverviewAnalytics,
  getHackathonAnalytics,
  type SedeOverviewAnalytics,
  type HackathonDetailAnalytics,
} from '@/lib/api/admin-services';
import { getHackathons } from '@/lib/api/services';
import type { Hackathon } from '@/types/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Users,
  Trophy,
  Code2,
  Bot,
  AlertTriangle,
  ServerCrash,
  ShieldAlert,
  Lock,
  RefreshCw,
  BarChart3,
  Clock,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Colors ───────────────────────────────────────────────────────────────────
const CHART_COLORS = [
  '#6d28d9', '#2563eb', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b',
];

// ─── Error Helpers ────────────────────────────────────────────────────────────
function getHttpStatus(error: unknown): number | null {
  const e = error as { response?: { status?: number }; status?: number };
  return e?.response?.status ?? e?.status ?? null;
}

function ErrorBanner({ error, context }: { error: unknown; context: 'overview' | 'detail' | 'hackathons' }) {
  const router = useRouter();
  const status = getHttpStatus(error);

  if (status === 401) {
    return (
      <Card className="border-red-500/50 bg-red-950/20">
        <CardContent className="flex items-center gap-3 py-6">
          <Lock className="h-6 w-6 text-red-400" />
          <div>
            <p className="font-semibold text-red-300">Sesión expirada</p>
            <p className="text-sm text-muted-foreground">Debes iniciar sesión nuevamente.</p>
          </div>
          <button
            className="ml-auto text-sm underline text-red-400 hover:text-red-300"
            onClick={() => router.push('/auth/login')}
          >
            Ir a Login
          </button>
        </CardContent>
      </Card>
    );
  }

  if (status === 403) {
    return (
      <Card className="border-yellow-500/50 bg-yellow-950/20">
        <CardContent className="flex items-center gap-3 py-6">
          <ShieldAlert className="h-6 w-6 text-yellow-400" />
          <div>
            <p className="font-semibold text-yellow-300">Sin permisos</p>
            <p className="text-sm text-muted-foreground">
              No tienes permisos para ver las analíticas de esta sede.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 400 && context === 'overview') {
    return (
      <Card className="border-orange-500/50 bg-orange-950/20">
        <CardContent className="flex items-center gap-3 py-6">
          <RefreshCw className="h-6 w-6 text-orange-400" />
          <div>
            <p className="font-semibold text-orange-300">Contexto inválido</p>
            <p className="text-sm text-muted-foreground">
              Por favor, vuelve a seleccionar tu sede en la pantalla de contexto.
            </p>
          </div>
          <button
            className="ml-auto text-sm underline text-orange-400 hover:text-orange-300"
            onClick={() => router.push('/auth/select-context')}
          >
            Seleccionar contexto
          </button>
        </CardContent>
      </Card>
    );
  }

  if ((status === 404 || status === 422) && context === 'detail') {
    return (
      <Card className="border-yellow-500/50 bg-yellow-950/20">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertTriangle className="h-6 w-6 text-yellow-400" />
          <div>
            <p className="font-semibold text-yellow-300">Hackathon no encontrado</p>
            <p className="text-sm text-muted-foreground">
              No se encontraron analíticas para este hackathon. Puede que haya sido eliminado o aún no tenga datos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 500 or unknown → full page-level error
  return (
    <Card className="border-red-500/50 bg-red-950/20">
      <CardContent className="flex items-center gap-3 py-6">
        <ServerCrash className="h-6 w-6 text-red-400" />
        <div>
          <p className="font-semibold text-red-300">Error del servidor</p>
          <p className="text-sm text-muted-foreground">
            Ocurrió un error inesperado al cargar las analíticas. Intenta recargar la página.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className="rounded-lg bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-5">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Helper: record → chart data ─────────────────────────────────────────────
function recordToChartData(rec: Record<string, number> | undefined | null) {
  if (!rec) return [];
  return Object.entries(rec).map(([name, value]) => ({ name, value }));
}

function formatMs(ms: number | undefined | null): string {
  if (ms == null || ms <= 0) return '—';
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
}

// ─── Overview Section ─────────────────────────────────────────────────────────
function OverviewSection({ data }: { data: SedeOverviewAnalytics }) {
  const roleData = useMemo(() => recordToChartData(data.users_by_role), [data.users_by_role]);
  const typeData = useMemo(() => recordToChartData(data.challenges_by_type), [data.challenges_by_type]);
  const diffData = useMemo(() => recordToChartData(data.challenges_by_difficulty), [data.challenges_by_difficulty]);
  const topicsData = useMemo(
    () => (data.ai_top_topics ?? []).slice(0, 10).map((t) => ({ name: t.topic, value: t.count })),
    [data.ai_top_topics],
  );

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Usuarios totales" value={data.users_total ?? 0} />
        <StatCard
          icon={Trophy}
          label="Hackathons totales"
          value={data.hackathons_total ?? 0}
          sub={`${data.hackathons_active ?? 0} activos · ${data.hackathons_completed ?? 0} completados`}
        />
        <StatCard
          icon={Trophy}
          label="Participación promedio"
          value={data.hackathons_avg_participation ?? 0}
          sub="estudiantes por hackathon"
        />
        <StatCard icon={Code2} label="Retos totales" value={data.challenges_total ?? 0} />
        <StatCard
          icon={Code2}
          label="Tasa de resolución"
          value={`${Math.round((data.average_resolution_rate ?? 0) * 100)}%`}
        />
        <StatCard
          icon={Bot}
          label="Interacciones IA"
          value={data.ai_interactions_total ?? 0}
          sub={`${(data.ai_interactions_avg_per_student ?? 0).toFixed(1)} prom/estudiante`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card>
          <CardHeader><CardTitle className="text-base">Usuarios por Rol</CardTitle></CardHeader>
          <CardContent>
            {roleData.length === 0 ? (
              <EmptyState message="Sin datos de roles" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {roleData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Challenges by Type */}
        <Card>
          <CardHeader><CardTitle className="text-base">Retos por Tipo</CardTitle></CardHeader>
          <CardContent>
            {typeData.length === 0 ? (
              <EmptyState message="Sin datos de tipos de reto" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Challenges by Difficulty */}
        <Card>
          <CardHeader><CardTitle className="text-base">Retos por Dificultad</CardTitle></CardHeader>
          <CardContent>
            {diffData.length === 0 ? (
              <EmptyState message="Sin datos de dificultad" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={diffData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {diffData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top AI Topics */}
        <Card>
          <CardHeader><CardTitle className="text-base">Temas más consultados (IA)</CardTitle></CardHeader>
          <CardContent>
            {topicsData.length === 0 ? (
              <EmptyState message="Sin datos de temas de IA" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topicsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Hackathon Detail Section ─────────────────────────────────────────────────
function HackathonDetailSection({ data }: { data: HackathonDetailAnalytics }) {
  const { participation, score_distribution, submissions_timeline, suspicious_pairs } = data;
  const avgTime = data.average_time_per_challenge ?? [];
  const hints = data.hints_used_per_challenge ?? [];
  const buckets = score_distribution?.buckets ?? [];

  return (
    <div className="space-y-6">
      {/* Participation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Inscritos" value={participation?.enrolled ?? 0} />
        <StatCard icon={TrendingUp} label="Activos" value={participation?.active ?? 0} />
        <StatCard icon={Trophy} label="Completaron al menos 1" value={participation?.completed_at_least_one ?? 0} />
      </div>

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribución de Puntajes</CardTitle>
          {score_distribution && (
            <p className="text-xs text-muted-foreground">
              Mín: {score_distribution.min_score} · Máx: {score_distribution.max_score} · Prom: {score_distribution.avg_score?.toFixed(1)} · P50: {score_distribution.p50_score} · P90: {score_distribution.p90_score}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {buckets.length === 0 ? (
            <EmptyState message="Sin datos de puntajes" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Easiest / Hardest */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Reto más fácil</CardTitle></CardHeader>
          <CardContent>
            {data.easiest_challenge ? (
              <div>
                <p className="font-medium">{data.easiest_challenge.name}</p>
                <p className="text-sm text-muted-foreground">Tasa de aprobación: {Math.round(data.easiest_challenge.pass_rate * 100)}%</p>
              </div>
            ) : (
              <EmptyState message="Sin datos" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Reto más difícil</CardTitle></CardHeader>
          <CardContent>
            {data.hardest_challenge ? (
              <div>
                <p className="font-medium">{data.hardest_challenge.name}</p>
                <p className="text-sm text-muted-foreground">Tasa de aprobación: {Math.round(data.hardest_challenge.pass_rate * 100)}%</p>
              </div>
            ) : (
              <EmptyState message="Sin datos" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Avg Time per Challenge */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Tiempo promedio por reto</CardTitle></CardHeader>
        <CardContent>
          {avgTime.length === 0 ? (
            <EmptyState message="Sin datos de tiempo" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 text-left font-medium">Reto</th>
                    <th className="py-2 text-right font-medium">Tiempo prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {avgTime.map((r, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2">{r.challenge_name ?? '—'}</td>
                      <td className="py-2 text-right font-mono">{formatMs(r.avg_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hints per Challenge */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Pistas usadas por reto</CardTitle></CardHeader>
        <CardContent>
          {hints.length === 0 ? (
            <EmptyState message="Sin datos de pistas" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, hints.length * 36)}>
              <BarChart data={hints.map((h) => ({ name: h.challenge_name ?? '—', hints: h.hints ?? 0 }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="hints" fill={CHART_COLORS[4]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Submissions Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Línea de tiempo de entregas</CardTitle></CardHeader>
        <CardContent>
          {(submissions_timeline ?? []).length === 0 ? (
            <EmptyState message="Sin datos de entregas" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={submissions_timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="Entregas" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Suspicious Pairs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" /> Pares sospechosos (anti-plagio)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(suspicious_pairs ?? []).length === 0 ? (
            <EmptyState message="No se detectaron pares sospechosos" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 text-left font-medium">Estudiante A</th>
                    <th className="py-2 text-left font-medium">Estudiante B</th>
                    <th className="py-2 text-left font-medium">Reto</th>
                    <th className="py-2 text-right font-medium">Similitud</th>
                  </tr>
                </thead>
                <tbody>
                  {suspicious_pairs!.map((sp, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2">{sp.pair[0]}</td>
                      <td className="py-2">{sp.pair[1]}</td>
                      <td className="py-2">{sp.challenge}</td>
                      <td className="py-2 text-right">
                        <Badge variant={sp.similarity >= 0.9 ? 'destructive' : 'secondary'}>
                          {Math.round(sp.similarity * 100)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SedeAnalyticsPage() {
  const sedeId = useAuthStore((s) => s?.currentSede?.id) ?? '';
  const [selectedHackathonId, setSelectedHackathonId] = useState<string | null>(null);

  // 1) Overview
  const overview = useQuery<SedeOverviewAnalytics>({
    queryKey: queryKeys.analytics.sede(sedeId || '__none'),
    queryFn: getSedeOverviewAnalytics,
    enabled: !!sedeId,
    retry: false,
  });

  // 2) Hackathon list for selector
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hackathonList = useQuery<any>({
    queryKey: queryKeys.hackathons.list({ limit: 50 }),
    queryFn: () => getHackathons({ limit: 50 }),
    enabled: !!sedeId,
    retry: 1,
  });

  // 3) Hackathon detail — only when selected
  const detail = useQuery<HackathonDetailAnalytics>({
    queryKey: queryKeys.analytics.hackathon(selectedHackathonId ?? '__none'),
    queryFn: () => getHackathonAnalytics(selectedHackathonId!),
    enabled: !!selectedHackathonId,
    retry: false,
  });

  // Normalise: data may arrive as array or paginated object
  const hackathons: Hackathon[] = useMemo(() => {
    const d = hackathonList.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    const obj = d as unknown as { items?: Hackathon[]; results?: Hackathon[] };
    return obj.items ?? obj.results ?? [];
  }, [hackathonList.data]);

  const selectedName = useMemo(
    () => hackathons.find((h) => h.id === selectedHackathonId)?.name ?? '',
    [hackathons, selectedHackathonId],
  );

  // ── 401/403/400 on overview → full-page error ──
  if (overview.isError) {
    const status = getHttpStatus(overview.error);
    if (status === 401 || status === 403 || status === 400 || status === 500 || status == null) {
      return (
        <div className="space-y-6">
          <PageHeader title="Analíticas de Sede" description="Estadísticas de participación, uso de IA y rendimiento" />
          <ErrorBanner error={overview.error} context="overview" />
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analíticas de Sede" description="Estadísticas de participación, uso de IA y rendimiento" />

      {/* Overview */}
      {overview.isLoading ? (
        <OverviewSkeleton />
      ) : overview.isError ? (
        <ErrorBanner error={overview.error} context="overview" />
      ) : overview.data ? (
        <OverviewSection data={overview.data} />
      ) : (
        <EmptyState message="No hay datos de analíticas disponibles" />
      )}

      {/* ── Hackathon Selector ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle por Hackathon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hackathonList.isError ? (
            <p className="text-sm text-muted-foreground">No se pudo cargar la lista de hackathons.</p>
          ) : (
            <Select
              value={selectedHackathonId ?? ''}
              onValueChange={(v) => setSelectedHackathonId(v || null)}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder={hackathonList.isLoading ? 'Cargando hackathons…' : 'Selecciona un hackathon'} />
              </SelectTrigger>
              <SelectContent>
                {hackathons.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name} <span className="text-muted-foreground ml-1">({h.status})</span>
                  </SelectItem>
                ))}
                {hackathons.length === 0 && !hackathonList.isLoading && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No hay hackathons disponibles</div>
                )}
              </SelectContent>
            </Select>
          )}

          {/* Detail content */}
          {selectedHackathonId && (
            <div className="pt-4">
              {selectedName && (
                <h3 className="text-lg font-semibold mb-4">{selectedName}</h3>
              )}
              {detail.isLoading ? (
                <DetailSkeleton />
              ) : detail.isError ? (
                <ErrorBanner error={detail.error} context="detail" />
              ) : detail.data ? (
                <HackathonDetailSection data={detail.data} />
              ) : (
                <EmptyState message="No hay datos para este hackathon" />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
