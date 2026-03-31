'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getMentorTeams, type MentorTeamSummary } from '@/lib/api/hackathon-services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';
import { Users, ArrowRight, BarChart3, MessageSquare, Trophy } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  forming: { label: 'Formándose', color: 'bg-unad-gold/10 text-unad-gold' },
  ready: { label: 'Listo', color: 'bg-secondary/10 text-secondary' },
  active: { label: 'Activo', color: 'bg-emerald-500/10 text-emerald-500' },
  disbanded: { label: 'Disuelto', color: 'bg-destructive/10 text-destructive' },
};

export default function StudentTeamsPage() {
  const { data: teams, isLoading } = useQuery({
    queryKey: queryKeys.teams.mentorAssigned,
    queryFn: getMentorTeams,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mis Equipos"
        description="Aquí encontrarás todos los equipos en los que participas actualmente."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : !teams || teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no estás en ningún equipo"
          description="Inscríbete en un hackathon para crear o unirte a un equipo."
        >
          <Link href="/dashboard/hackathons">
            <Button>Ver Hackathones</Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((t: MentorTeamSummary) => {
            const status = STATUS_CONFIG[t.status] ?? { label: t.status, color: 'bg-muted text-muted-foreground' };
            return (
              <Card key={t.id} className="border-border/50 hover:shadow-md transition-all hover:border-primary/20 group">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t.hackathon_name || 'Hackathon Event'}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                        {t.name}
                      </h3>
                    </div>
                    <Badge variant="outline" className={`${status.color} border-0 capitalize text-[10px]`}>
                      {status.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{t.member_count} miembros</span>
                    </div>
                  </div>

                  {typeof t.progress_percent === 'number' && (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs font-medium">
                        <span>Progreso del equipo</span>
                        <span>{t.progress_percent}%</span>
                      </div>
                      <Progress value={t.progress_percent} className="h-1.5" />
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <Link href={`/dashboard/teams/${t.id}/progress`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                        <BarChart3 className="w-3.5 h-3.5" /> Progreso
                      </Button>
                    </Link>
                    <Link href={`/dashboard/teams/${t.id}`} className="flex-1">
                      <Button variant="default" size="sm" className="w-full gap-1.5 text-xs">
                        <MessageSquare className="w-3.5 h-3.5" /> Gestionar
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
