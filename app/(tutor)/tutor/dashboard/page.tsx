'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n/context';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getMentorTeams, type MentorTeamSummary } from '@/lib/api/hackathon-services';
import { TutorHero } from '@/components/dashboard/tutor-hero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { Trophy, Inbox, BookOpen, Cpu, TrendingUp, Users, ArrowRight } from 'lucide-react';

export default function TutorDashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s?.user);
  const currentSede = useAuthStore((s) => s?.currentSede);

  const { data: mentorTeams, isLoading: teamsLoading } = useQuery({
    queryKey: queryKeys.teams.mentorAssigned,
    queryFn: getMentorTeams,
  });

  // Calculate metrics for TutorHero
  const mentorTeamsCount = mentorTeams?.length ?? 0;
  const averageProgress = mentorTeamsCount > 0 && mentorTeams 
    ? mentorTeams.reduce((acc, team) => acc + (team.progress_percent || 0), 0) / mentorTeamsCount
    : 0;
  const stuckTeamsCount = mentorTeams?.filter(team => (team.progress_percent || 0) < 20).length ?? 0;

  const stats = [
    { label: t('tutor.dashboard.activeHackathons'), value: '1', icon: Trophy, color: 'text-primary', bg: 'bg-primary/10' },
    { label: t('tutor.dashboard.pendingReviews'), value: '0', icon: Inbox, color: 'text-accent', bg: 'bg-accent/10' },
    { label: t('tutor.dashboard.createdChallenges'), value: '0', icon: BookOpen, color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: t('tutor.dashboard.assignedTeams'), value: String(mentorTeamsCount), icon: Users, color: 'text-unad-gold', bg: 'bg-unad-gold/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <TutorHero 
        user={user}
        currentSede={currentSede || null}
        mentorTeamsCount={mentorTeamsCount}
        averageProgress={averageProgress}
        stuckTeamsCount={stuckTeamsCount}
        loading={teamsLoading}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mentor: Assigned Teams */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-unad-gold" />
            {t('tutor.dashboard.assignedTeamsTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !mentorTeams?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('tutor.teams.noTeams')}</p>
          ) : (
            <div className="space-y-3">
              {mentorTeams.map((t_item: MentorTeamSummary) => (
                <div key={t_item.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{t_item.name}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{t_item.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t_item.hackathon_name ?? t('common.hackathon')} · {t_item.member_count} {t('tutor.dashboard.members')}
                    </p>
                    {typeof t_item.progress_percent === 'number' && (
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={t_item.progress_percent} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{t_item.progress_percent}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Link href="/tutor/teams">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              {t('tutor.dashboard.recentAI')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('tutor.dashboard.noRecentAI')}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-secondary" />
              {t('tutor.dashboard.studentPerformance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('tutor.dashboard.noStatsAvailable')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
