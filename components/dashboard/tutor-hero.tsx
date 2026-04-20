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
      <div className="relative z-10 space-y-8">
        
        {/* Top Header: Academic Focus & Quick Context */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3 max-w-2xl">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-bold tracking-wider uppercase text-[10px]">
              {t('tutor.hero.subtitle', { sede: currentSede?.name || t('common.campus') })}
            </Badge>
            
            <div className="space-y-1.5">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                {t('tutor.hero.greeting')}, {firstName}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed font-medium">
                {t('tutor.hero.groupsManaged', { count: mentorTeamsCount })}
              </p>
            </div>
          </div>

          {/* Right Context Chips */}
          <div className="flex flex-wrap gap-2.5 md:pt-1 md:justify-end lg:justify-start shrink-0 lg:w-[22rem]">
            {/* Equipos: Azul suave */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600/90 dark:text-blue-400 bg-blue-500/5 backdrop-blur-sm px-2.5 py-1 rounded-md border border-blue-500/20">
              <Users className="w-3.5 h-3.5 opacity-70" />
              <span>{mentorTeamsCount === 0 ? 'Sin equipos' : `${mentorTeamsCount} equipos`}</span>
            </div>
            {/* Revisiones: Ámbar suave (intensidad ligeramente reducida) */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600/80 dark:text-amber-400/80 bg-amber-500/5 backdrop-blur-sm px-2.5 py-1 rounded-md border border-amber-500/20">
              <Inbox className="w-3.5 h-3.5 opacity-70" />
              <span>{mentorTeamsCount === 0 ? 'Sin revisiones' : 'Entregas al día'}</span>
            </div>
            {/* Hackathon: Turquesa suave */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-teal-600/90 dark:text-teal-400 bg-teal-500/5 backdrop-blur-sm px-2.5 py-1 rounded-md border border-teal-500/20">
              <Target className="w-3.5 h-3.5 opacity-70" />
              <span>1 hackathon activo</span>
            </div>
          </div>
        </div>

        {/* Lower Section: Restructured into two horizontal rows */}
        {/* Lower Section: Two Equal-Height Columns */}
        <div className="flex flex-col lg:flex-row items-stretch gap-8">
          
          {/* Left Column: Banner + Actions */}
          <div className="flex-1 flex flex-col space-y-6 max-w-2xl">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <Link href="/tutor/teams" prefetch={false} className="w-full">
                <Button 
                  size="lg" 
                  variant={mentorTeamsCount === 0 ? "outline" : "default"}
                  className={`w-full h-14 justify-start px-6 text-base font-bold transition-all hover:translate-y-[-2px] ${mentorTeamsCount > 0 ? 'shadow-xl shadow-primary/20' : 'border-2 opacity-80'}`}
                >
                  <Users className={`w-5 h-5 mr-3 ${mentorTeamsCount === 0 ? 'opacity-60' : 'opacity-80'}`} />
                  {t('tutor.hero.action.viewTeams')}
                </Button>
              </Link>
              <Link href="/tutor/challenges" className="w-full">
                <Button 
                  size="lg" 
                  variant={mentorTeamsCount === 0 ? "default" : "secondary"}
                  className={`w-full h-14 justify-start px-6 text-base font-bold transition-all hover:translate-y-[-2px] ${mentorTeamsCount === 0 ? 'shadow-xl shadow-primary/20' : ''}`}
                >
                  <BookOpen className={`w-5 h-5 mr-3 ${mentorTeamsCount === 0 ? 'opacity-80' : 'opacity-70'}`} />
                  {t('tutor.hero.action.challengeLibrary')}
                </Button>
              </Link>
              <Link href="/tutor/grading" className="w-full">
                <Button size="lg" variant="outline" className="w-full h-14 justify-start px-6 text-base font-bold border-2 transition-all hover:translate-y-[-2px]">
                  <Inbox className="w-5 h-5 mr-3 opacity-60" />
                  {t('tutor.hero.action.gradeSubmissions')}
                </Button>
              </Link>
              <Link href="/tutor/ai-generation" className="w-full">
                <Button size="lg" variant="outline" className="w-full h-14 justify-start px-6 text-base font-bold border-2 border-purple-500/30 bg-purple-500/5 text-purple-600 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all hover:translate-y-[-2px]">
                  <Sparkles className="w-5 h-5 mr-3 opacity-80" />
                  {t('tutor.hero.action.aiGeneration')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Widget Only */}
          <div className="lg:w-[22rem] w-full shrink-0 flex flex-col gap-3">
            {/* Progress Widget (Stretches to fill remaining height) */}
            <div className="flex-1 bg-background/40 backdrop-blur-xl border border-border/50 rounded-3xl p-5 shadow-2xl flex flex-col justify-between animate-in fade-in zoom-in-95 duration-700">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                    {t('tutor.hero.averageProgress')}
                  </p>
                  <TrendingUp className={`w-4 h-4 ${mentorTeamsCount === 0 ? 'text-muted-foreground/30' : 'text-primary/50'}`} />
                </div>

                {mentorTeamsCount === 0 ? (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black text-muted-foreground/80">--%</span>
                      <div className="w-9 h-9 rounded-xl bg-muted/20 flex items-center justify-center border border-border/40">
                        <Clock className="w-4 h-4 text-muted-foreground/70" />
                      </div>
                    </div>
                    <Progress value={0} className="h-2 bg-muted/40" />
                  </div>
                ) : (
                  <div className="space-y-3 mt-4">
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

              <div className="mt-auto pt-2">
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
                  <div className={`p-3 rounded-xl border transition-all ${
                    stuckTeamsCount > 0 
                      ? 'bg-red-500/5 border-red-500/20' 
                      : 'bg-green-500/5 border-green-500/20'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {stuckTeamsCount > 0 ? (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
