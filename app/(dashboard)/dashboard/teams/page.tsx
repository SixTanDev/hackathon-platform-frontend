'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getStudentTeams, type MentorTeamSummary } from '@/lib/api/hackathon-services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/shared/empty-state';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';
import { Users, BarChart3, MessageSquare, Trophy, ArrowRight } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  forming: { label: 'Formándose', color: 'bg-unad-gold/10 text-unad-gold' },
  ready: { label: 'Listo', color: 'bg-secondary/10 text-secondary' },
  active: { label: 'Activo', color: 'bg-emerald-500/10 text-emerald-500' },
  disbanded: { label: 'Disuelto', color: 'bg-destructive/10 text-destructive' },
};

export default function StudentTeamsPage() {
  const userId = useAuthStore((s) => s?.user?.id);
  const enrolledHackathonIds = useAuthStore((s) => s?.enrolledHackathonIds ?? []);

  const { data: teams, isLoading } = useQuery({
    queryKey: queryKeys.teams.studentMine(enrolledHackathonIds),
    queryFn: () => getStudentTeams(enrolledHackathonIds, userId),
    enabled: !!userId,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mis Equipos"
        description="Aquí encontrarás todos los equipos en los que participas actualmente."
      >
        <div className="inline-flex items-center rounded-full border border-[#248f8b]/20 bg-[#248f8b]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1f7a77] dark:border-[#35a19d]/25 dark:bg-[#35a19d]/10 dark:text-[#86e2cf]">
          Teams Hub
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : !teams || teams.length === 0 ? (
        <EmptyState
          icon={Users}
          className="rounded-[2rem] border border-[#248f8b]/12 bg-gradient-to-b from-[#248f8b]/[0.06] via-[#248f8b]/[0.02] to-transparent dark:from-[#35a19d]/[0.08]"
          title="Aún no estás en ningún equipo"
          description="Inscríbete en un hackathon para crear o unirte a un equipo."
        >
          <div className="mb-2 flex items-center justify-center">
            <Link href="/dashboard/hackathons">
              <Button className="h-12 rounded-2xl bg-[#1c6d75] px-6 text-[15px] font-semibold text-white shadow-[0_14px_32px_rgba(28,109,117,0.28)] hover:bg-[#248f8b] hover:shadow-[0_18px_38px_rgba(36,143,139,0.34)]">
                Ver Hackathones
                <ArrowRight className="ml-2 h-4.5 w-4.5" />
              </Button>
            </Link>
          </div>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {teams.map((t: MentorTeamSummary) => {
            const status = STATUS_CONFIG[t.status] ?? { label: t.status, color: 'bg-muted text-muted-foreground' };
            return (
              <Card key={t.id} className="group border-border/50 transition-all hover:border-primary/20 hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {t.hackathon_name || 'Hackathon Event'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold transition-colors group-hover:text-primary">
                        {t.name}
                      </h3>
                    </div>
                    <Badge variant="outline" className={`${status.color} border-0 capitalize text-[10px]`}>
                      {status.label}
                    </Badge>
                  </div>

                  <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{t.member_count} miembros</span>
                    </div>
                  </div>

                  {typeof t.progress_percent === 'number' && (
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span>Progreso del equipo</span>
                        <span>{t.progress_percent}%</span>
                      </div>
                      <Progress value={t.progress_percent} className="h-1.5" />
                    </div>
                  )}

                  <div className="flex gap-2 border-t border-border/50 pt-2">
                    <Link href={`/dashboard/teams/${t.id}/progress`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                        <BarChart3 className="h-3.5 w-3.5" /> Progreso
                      </Button>
                    </Link>
                    <Link href={`/dashboard/teams/${t.id}`} className="flex-1">
                      <Button variant="default" size="sm" className="w-full gap-1.5 text-xs">
                        <MessageSquare className="h-3.5 w-3.5" /> Gestionar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
