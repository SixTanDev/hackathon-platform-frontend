'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  getTeamDetail,
  getTeamProgress,
  getHackathonChallenges,
  type TeamProgressEntry,
  type HackathonChallengeWithDetail,
} from '@/lib/api/hackathon-services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ArrowLeft, Users, Trophy, Target, Lightbulb, Clock } from 'lucide-react';
import Link from 'next/link';

const CHART_COLORS = ['#004669', '#248F8B', '#F47920', '#E7B200', '#6366f1', '#ec4899'];

export default function TeamProgressPage() {
  const { id: teamId } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: queryKeys.teams.detail(teamId),
    queryFn: () => getTeamDetail(teamId),
    enabled: !!teamId,
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: queryKeys.teams.progress(teamId),
    queryFn: () => getTeamProgress(teamId),
    enabled: !!teamId,
  });

  const { data: challenges } = useQuery({
    queryKey: queryKeys.hackathons.challenges(team?.hackathon_id ?? ''),
    queryFn: () => getHackathonChallenges(team!.hackathon_id),
    enabled: !!team?.hackathon_id,
  });

  const entries: TeamProgressEntry[] = progress ?? [];
  const totalPoints = entries.reduce((s, e) => s + e.total_points, 0);
  const totalSolved = entries.reduce((s, e) => s + e.challenges_solved, 0);
  const isLoading = teamLoading || progressLoading;

  // Contribution chart data
  const chartData = entries.map((e) => ({
    name: e.display_name ?? e.user_global_id.slice(0, 8),
    puntos: e.total_points,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-1">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-unad-gold" />
            Progreso del Equipo
          </h1>
          {team && <p className="text-sm text-muted-foreground mt-1">{team.name}</p>}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Puntos Totales</p>
                    <p className="text-2xl font-bold text-unad-gold">{totalPoints.toLocaleString()}</p>
                  </div>
                  <Trophy className="w-8 h-8 text-unad-gold/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Retos Resueltos</p>
                    <p className="text-2xl font-bold text-secondary">{totalSolved}</p>
                  </div>
                  <Target className="w-8 h-8 text-secondary/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Miembros</p>
                    <p className="text-2xl font-bold">{team?.members?.filter((m) => m.status === 'accepted').length ?? 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contribution Chart */}
          {chartData.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Contribución por Miembro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="puntos" radius={[6, 6, 0, 0]}>
                        {chartData.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Individual Stats Table */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Estadísticas Individuales</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="px-4 py-3 text-left">Miembro</th>
                      <th className="px-4 py-3 text-right">Retos</th>
                      <th className="px-4 py-3 text-right">Puntos</th>
                      <th className="px-4 py-3 text-right">Última entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => (
                      <tr key={e.user_global_id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                              {(e.display_name ?? e.user_global_id)[0].toUpperCase()}
                            </div>
                            <span className="font-medium">{e.display_name ?? e.user_global_id.slice(0, 12)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant="secondary" className="text-xs">{e.challenges_solved}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">{e.total_points.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {e.last_submission_at ? new Date(e.last_submission_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {entries.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">Sin datos de progreso aún</div>
              )}
            </CardContent>
          </Card>

          {/* Challenge Matrix (if challenges available) */}
          {(challenges?.length ?? 0) > 0 && entries.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Matriz de Retos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="px-3 py-2 text-left">Reto</th>
                        {entries.map((e) => (
                          <th key={e.user_global_id} className="px-3 py-2 text-center min-w-[80px]">
                            {(e.display_name ?? e.user_global_id.slice(0, 6))}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {challenges?.slice(0, 20).map((ch: HackathonChallengeWithDetail) => (
                        <tr key={ch.id} className="border-b border-border/50">
                          <td className="px-3 py-2 font-medium">
                            {ch.challenge?.title ?? `Reto ${ch.order_index + 1}`}
                          </td>
                          {entries.map((e) => (
                            <td key={e.user_global_id} className="px-3 py-2 text-center">
                              <span className="text-muted-foreground">—</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
