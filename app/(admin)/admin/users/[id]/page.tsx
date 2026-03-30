'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getStudentAnalytics } from '@/lib/api/admin-services';
import type { StudentAnalytics } from '@/lib/api/admin-services';
import { queryKeys } from '@/lib/query-client';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Trophy,
  Star,
  Code2,
  Award,
  Brain,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-500/10 text-purple-400' },
  tutor: { label: 'Tutor', color: 'bg-blue-500/10 text-blue-400' },
  director_semillero: { label: 'Director', color: 'bg-teal-500/10 text-teal-400' },
  student: { label: 'Estudiante', color: 'bg-green-500/10 text-green-400' },
  guest: { label: 'Invitado', color: 'bg-gray-500/10 text-gray-400' },
};

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.studentDetail(userId),
    queryFn: () => getStudentAnalytics(userId),
  });

  const d = data as (StudentAnalytics & Record<string, any>) | undefined;
  const rb = d ? (ROLE_BADGE[(d.role as string) ?? 'student'] ?? ROLE_BADGE.student) : ROLE_BADGE.student;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  if (!d) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => router.push('/admin/users')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <p className="text-muted-foreground text-center py-12">No se encontró información del usuario.</p>
      </div>
    );
  }

  const aiUsage = d.ai_usage;
  const totalSolved = Object.values(d.solved_by_category ?? {}).reduce((a, b) => a + b, 0);
  const categoryData = Object.entries(d.solved_by_category ?? {}).map(([cat, solved]) => ({ category: cat, solved }));
  const difficultyData = Object.entries(d.solved_by_difficulty ?? {}).map(([diff, count]) => ({ difficulty: diff, count }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/users')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{d.full_name ?? d.user_global_id}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {d.email && <span className="text-sm text-muted-foreground">{String(d.email)}</span>}
            <Badge variant="outline" className={`text-[10px] ${rb.color}`}>{rb.label}</Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Retos resueltos', value: totalSolved, icon: Code2, color: 'text-secondary', bg: 'bg-secondary/10' },
          { label: 'Hackathones', value: d.participation_history?.length ?? 0, icon: Award, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Racha actual', value: `${d.streaks?.current_streak_days ?? 0}d`, icon: Star, color: 'text-unad-gold', bg: 'bg-unad-gold/10' },
          { label: 'Mejor racha', value: `${d.streaks?.longest_streak_days ?? 0}d`, icon: Trophy, color: 'text-accent', bg: 'bg-accent/10' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold mt-1">{s.value}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Usage */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-secondary" />
            Uso de IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{aiUsage.hints_requested}</p>
              <p className="text-xs text-muted-foreground">Pistas solicitadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{aiUsage.document_interactions}</p>
              <p className="text-xs text-muted-foreground">Interacciones documentos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{aiUsage.total_interactions}</p>
              <p className="text-xs text-muted-foreground">Total interacciones</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="hackathons">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="hackathons">Historial Hackathones</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento por Categoría</TabsTrigger>
          <TabsTrigger value="badges">Insignias</TabsTrigger>
        </TabsList>

        {/* Hackathon History */}
        <TabsContent value="hackathons" className="mt-4">
          {!d.participation_history || d.participation_history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin historial de hackathones.</p>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hackathon</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Puntaje</TableHead>
                      <TableHead className="text-right">Ranking</TableHead>
                      <TableHead className="text-right">Retos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.participation_history.map((h, idx) => (
                      <TableRow key={h.hackathon_id ?? idx}>
                        <TableCell className="font-medium">{h.hackathon_name ?? h.hackathon_id}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{h.status ?? '—'}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{h.score ?? '—'}</TableCell>
                        <TableCell className="text-right">{h.rank ? `#${h.rank}` : '—'}</TableCell>
                        <TableCell className="text-right">{h.challenges_completed ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Chart */}
        <TabsContent value="performance" className="mt-4">
          {categoryData.length === 0 && difficultyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos de rendimiento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryData.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Retos por Categoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                          <XAxis dataKey="category" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                          <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                          <Bar dataKey="solved" fill="hsl(var(--secondary))" name="Resueltos" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {difficultyData.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Retos por Dificultad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={difficultyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                          <XAxis dataKey="difficulty" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                          <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                          <Bar dataKey="count" fill="hsl(var(--accent))" name="Resueltos" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Badges */}
        <TabsContent value="badges" className="mt-4">
          {!d.badges || d.badges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin insignias obtenidas.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {d.badges.map((b) => (
                <Card key={b.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-unad-gold/10 flex items-center justify-center">
                      <Award className="w-5 h-5 text-unad-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground">{b.slug}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
