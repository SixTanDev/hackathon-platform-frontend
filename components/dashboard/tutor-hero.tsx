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
  CheckCircle2
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

  const firstName = user?.full_name?.split(' ')[0] || 'Tutor';

  return (
    <section className={styles.surfaceFeatured} aria-label="Tutor Dashboard Hero">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
        
        {/* Left Side: Academic Focus */}
        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-bold tracking-wider uppercase text-[10px]">
              {t('tutor.hero.subtitle', { sede: currentSede?.name || t('common.campus') })}
            </Badge>
            
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                {t('tutor.hero.greeting')}, {firstName}
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed font-medium">
                {t('tutor.hero.groupsManaged', { count: mentorTeamsCount })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link href="/tutor/teams">
              <Button size="lg" className="h-14 px-8 text-base font-bold shadow-xl shadow-primary/20">
                <Users className="w-5 h-5 mr-2" />
                {t('tutor.hero.action.viewTeams')}
              </Button>
            </Link>
            <Link href="/tutor/challenges">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-bold">
                <BookOpen className="w-5 h-5 mr-2" />
                {t('tutor.hero.action.challengeLibrary')}
              </Button>
            </Link>
            <Link href="/tutor/grading">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold border-2">
                <Inbox className="w-5 h-5 mr-2" />
                {t('tutor.hero.action.gradeSubmissions')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Side: Academic Monitoring Widget */}
        <div className="lg:w-[22rem] w-full shrink-0 animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-3xl p-7 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                {t('tutor.hero.averageProgress')}
              </p>
              <TrendingUp className="w-4 h-4 text-primary/50" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-foreground">{Math.round(averageProgress)}%</span>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
              </div>
              <Progress value={averageProgress} className="h-2.5 bg-muted/50" />
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              stuckTeamsCount > 0 
                ? 'bg-red-500/5 border-red-500/20' 
                : 'bg-green-500/5 border-green-500/20'
            }`}>
              <div className="flex items-center gap-3">
                {stuckTeamsCount > 0 ? (
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {stuckTeamsCount > 0 
                      ? t('tutor.hero.stuckTeams', { count: stuckTeamsCount })
                      : t('tutor.hero.noStuckTeams')}
                  </p>
                  {stuckTeamsCount > 0 && (
                    <Link href="/tutor/teams?filter=stuck" className="text-[9px] text-red-400/80 hover:text-red-400 mt-0.5 flex items-center gap-1 font-bold uppercase tracking-wider transition-colors">
                      {t('common.details')}
                      <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
