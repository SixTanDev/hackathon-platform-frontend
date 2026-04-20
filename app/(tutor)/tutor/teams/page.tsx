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
import { Users, ArrowRight, BarChart3, MessageSquare, ArrowLeft, BookOpen } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export default function TutorTeamsPage() {
  const { t } = useTranslation();
  const { data: teams, isLoading } = useQuery({
    queryKey: queryKeys.teams.tutorVisible({}),
    queryFn: () => getTutorTeams(),
  });
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('tutor.teams.title')}
        description={t('tutor.teams.description')}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !teams?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/5 rounded-2xl border-2 border-dashed border-border/60 max-w-3xl mx-auto mt-8">
          <div className="bg-muted/10 p-4 rounded-full mb-4">
            <Users className="w-8 h-8 text-muted-foreground/60" />
          </div>
          <h3 className="text-xl font-bold text-foreground/90 mb-2">{t('tutor.teams.emptyState.title')}</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
            {t('tutor.teams.emptyState.description')}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link href="/tutor/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> {t('tutor.teams.emptyState.actionBack')}
              </Button>
            </Link>
            <Link href="/tutor/challenges">
              <Button variant="default" className="gap-2">
                <BookOpen className="w-4 h-4" /> {t('tutor.teams.emptyState.actionChallenges')}
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((t_item: MentorTeamSummary) => (
            <Card key={t_item.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{t_item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t_item.hackathon_name ?? 'Hackathon'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{t_item.status}</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {t_item.member_count} miembros
                  </span>
                </div>
                {typeof t_item.progress_percent === 'number' && (
                  <div className="flex items-center gap-2 mb-4">
                    <Progress value={t_item.progress_percent} className="h-2 flex-1" />
                    <span className="text-xs font-medium">{t_item.progress_percent}%</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Link href={`/dashboard/teams/${t_item.id}/progress`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" /> Progreso
                    </Button>
                  </Link>
                  <Link href={`/dashboard/teams/${t_item.id}`} className="flex-1">
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
