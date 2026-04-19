'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getTutorTeams, type MentorTeamSummary } from '@/lib/api/hackathon-services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { Users, ArrowRight, BarChart3, MessageSquare } from 'lucide-react';

export default function TutorTeamsPage() {
  const { data: teams, isLoading } = useQuery({
    queryKey: queryKeys.teams.tutorVisible({}),
    queryFn: () => getTutorTeams(),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mis Equipos Asignados"
        description="Equipos bajo tu tutoría. Puedes ver su progreso y participar en el chat."
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !teams?.length ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No tienes equipos asignados actualmente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((t: MentorTeamSummary) => (
            <Card key={t.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.hackathon_name ?? 'Hackathon'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{t.status}</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {t.member_count} miembros
                  </span>
                </div>
                {typeof t.progress_percent === 'number' && (
                  <div className="flex items-center gap-2 mb-4">
                    <Progress value={t.progress_percent} className="h-2 flex-1" />
                    <span className="text-xs font-medium">{t.progress_percent}%</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Link href={`/dashboard/teams/${t.id}/progress`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" /> Progreso
                    </Button>
                  </Link>
                  <Link href={`/dashboard/teams/${t.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Chat
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
