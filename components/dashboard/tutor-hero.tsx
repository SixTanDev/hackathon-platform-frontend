'use client';

import { useTranslation } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  BookOpen,
  Inbox,
  Target,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import type { User, Sede } from '@/types/api';
import styles from './dashboard-styles.module.css';

interface TutorHeroProps {
  user: User | null;
  currentSede: { name: string } | null;
  mentorTeamsCount: number;
  averageProgress: number;
  stuckTeamsCount: number;
  loading?: boolean;
}

export function TutorHero({
  user,
  currentSede,
  mentorTeamsCount,
  averageProgress,
  stuckTeamsCount,
  loading
}: TutorHeroProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className={`${styles.surfaceFeatured} h-64 animate-pulse bg-muted opacity-50`} />;
  }

  const isDemoUser = user?.full_name?.toLowerCase().includes('demo');
  const firstName = isDemoUser || !user?.full_name ? 'Tutor' : user.full_name.split(' ')[0];

  return (
    <section className={styles.surfaceFeatured} aria-label="Tutor Dashboard Hero">
      <div className="flex flex-col lg:flex-row justify-between gap-8 relative z-10">

        {/* Left Side: Content & Actions */}
        <div className="flex-1 flex flex-col space-y-6 max-w-2xl">
          <div className="space-y-4">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-bold tracking-wider uppercase text-[10px] animate-in fade-in slide-in-from-left-4 duration-500">
              {t('tutor.hero.subtitle', { sede: currentSede?.name || t('common.campus') })}
            </Badge>

            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
                {t('tutor.hero.greeting')}, {firstName}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">
                {t('tutor.hero.groupsManaged', { count: mentorTeamsCount })}
              </p>
            </div>
          </div>

          <div className="flex flex-col space-y-6 pt-2">
            {mentorTeamsCount === 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{t('tutor.hero.emptyState.title')}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    {t('tutor.hero.emptyState.desc1')}
                    <strong className="text-primary font-bold">{t('tutor.hero.emptyState.descStrong')}</strong>
                    {t('tutor.hero.emptyState.desc2')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Context Chips & Widget */}
        <div className="lg:w-[22rem] w-full shrink-0 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-700">
          
          {/* Right Context Chips */}
          <div className="flex flex-wrap gap-2.5 md:justify-end lg:justify-start">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600/90 dark:text-blue-400 bg-blue-500/5 backdrop-blur-sm px-2.5 py-1 rounded-md border border-blue-500/20">
              <Users className="w-3.5 h-3.5 opacity-70" />
              <span>{mentorTeamsCount === 0 ? t('tutor.hero.chips.noTeams') : t('tutor.hero.chips.teamsCount', { count: mentorTeamsCount })}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600/80 dark:text-amber-400/80 bg-amber-500/5 backdrop-blur-sm px-2.5 py-1 rounded-md border border-amber-500/20">
              <Inbox className="w-3.5 h-3.5 opacity-70" />
              <span>{mentorTeamsCount === 0 ? t('tutor.hero.chips.noSubmissions') : t('tutor.hero.chips.submissionsUpToDate')}</span>
            </div>
          </div>

          <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-3xl p-5 shadow-2xl flex flex-col gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                  {t('tutor.hero.averageProgress')}
                </p>
                <TrendingUp className={`w-4 h-4 ${mentorTeamsCount === 0 ? 'text-muted-foreground/30' : 'text-primary/50'}`} />
              </div>
              {mentorTeamsCount === 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-muted-foreground/80">--%</span>
                    <div className="w-9 h-9 rounded-xl bg-muted/20 flex items-center justify-center border border-border/40">
                      <Clock className="w-4 h-4 text-muted-foreground/70" />
                    </div>
                  </div>
                  <Progress value={0} className="h-2 bg-muted/40" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-foreground">{Math.round(averageProgress)}%</span>
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <Progress value={averageProgress} className="h-2 bg-muted/50" />
                </div>
              )}
            </div>
            <div className="pt-2">
              {mentorTeamsCount === 0 ? (
                <div className="p-3 rounded-xl border-2 border-dashed border-border/60 bg-muted/5 transition-all">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-muted-foreground/90 truncate">
                        {t('tutor.hero.emptyProgress.title')}
                      </p>
                      <p className="text-[9px] text-muted-foreground/80 mt-0.5 uppercase tracking-wider font-medium">
                        {t('tutor.hero.emptyProgress.subtitle')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-3 rounded-xl border transition-all ${stuckTeamsCount > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                  <div className="flex items-center gap-2.5">
                    {stuckTeamsCount > 0 ? <AlertCircle className="w-4 h-4 text-red-400 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{stuckTeamsCount > 0 ? t('tutor.hero.stuckTeams', { count: stuckTeamsCount }) : t('tutor.hero.noStuckTeams')}</p>
                      {stuckTeamsCount > 0 && (
                        <Link href="/tutor/teams?filter=stuck" className="text-[9px] text-red-400/80 hover:text-red-400 mt-0.5 flex items-center gap-1 font-bold uppercase tracking-wider transition-colors">
                          {t('common.details')}
                          <ArrowRight className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Independent Action Bar Below */}
      <div className="mt-8 pt-2 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-4 w-full">
          {/* 1. Challenge Library (Primary CTA) */}
          <Link href="/tutor/challenges" className="flex-1 min-w-0">
            <Button 
              size="lg" 
              variant={mentorTeamsCount === 0 ? "default" : "secondary"}
              className={`w-full h-14 justify-start px-6 text-sm md:text-base font-bold transition-all hover:translate-y-[-2px] ${mentorTeamsCount === 0 ? 'shadow-lg shadow-primary/20' : ''}`}
            >
              <BookOpen className={`w-5 h-5 mr-3 shrink-0 ${mentorTeamsCount === 0 ? 'opacity-80' : 'opacity-70'}`} />
              <span className="whitespace-nowrap">{t('tutor.hero.action.challengeLibrary')}</span>
            </Button>
          </Link>

          {/* 2. AI Generation */}
          <Link href="/tutor/ai-generation" className="flex-1 min-w-0">
            <Button size="lg" variant="outline" className="w-full h-14 justify-start px-6 text-sm md:text-base font-bold border-2 border-purple-500/30 bg-purple-500/5 text-purple-600 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all hover:translate-y-[-2px]">
              <Sparkles className="w-5 h-5 mr-3 shrink-0 opacity-80" />
              <span className="whitespace-nowrap">{t('tutor.hero.action.aiGeneration')}</span>
            </Button>
          </Link>

          {/* 3. My Teams */}
          <Link href="/tutor/teams" prefetch={false} className="flex-1 min-w-0">
            <Button 
              size="lg" 
              variant={mentorTeamsCount === 0 ? "outline" : "default"}
              className={`w-full h-14 justify-start px-6 text-sm md:text-base font-bold transition-all hover:translate-y-[-2px] ${mentorTeamsCount > 0 ? 'shadow-lg shadow-primary/20' : 'border-2 opacity-80'}`}
            >
              <Users className={`w-5 h-5 mr-3 shrink-0 ${mentorTeamsCount === 0 ? 'opacity-60' : 'opacity-80'}`} />
              <span className="whitespace-nowrap">{t('tutor.hero.action.viewTeams')}</span>
            </Button>
          </Link>
          
          {/* 4. Grade Submissions */}
          <Link href="/tutor/grading" className="flex-1 min-w-0">
            <Button size="lg" variant="outline" className="w-full h-14 justify-start px-6 text-sm md:text-base font-bold border-2 transition-all hover:translate-y-[-2px]">
              <Inbox className="w-5 h-5 mr-3 shrink-0 opacity-60" />
              <span className="whitespace-nowrap">{t('tutor.hero.action.gradeSubmissions')}</span>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
