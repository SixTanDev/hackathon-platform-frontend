'use client';

import { useTranslation } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, ArrowRight, Zap, Target, Rocket } from 'lucide-react';
import Link from 'next/link';
import type { User, ProfileResponse, Hackathon } from '@/types/api';
import styles from './dashboard-styles.module.css';

interface DashboardHeroProps {
  user: User | null;
  profile: ProfileResponse | null;
  activeHackathons: Hackathon[];
  loading?: boolean;
  eventTitle?: string;
  eventSubtitle?: string;
  nextGoal?: string;
}

export function DashboardHero({ 
  user, 
  profile, 
  activeHackathons, 
  loading,
  eventTitle,
  eventSubtitle,
  nextGoal
}: DashboardHeroProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className={`${styles.surfaceFeatured} h-64 animate-pulse bg-muted opacity-50`} />;
  }

  // Find most urgent hackathon
  const urgentHackathon = [...activeHackathons]
    .filter(h => h.status === 'active' && h.ends_at)
    .sort((a, b) => new Date(a.ends_at!).getTime() - new Date(b.ends_at!).getTime())[0];

  const firstName = user?.full_name?.split(' ')[0] || 'Coder';
  const rank = profile?.sede_rank ? `#${profile.sede_rank}` : '--';
  const totalPoints = profile?.total_points || 0;
  
  // Progress logic: Toward a 1000pt milestone or based on rank if possible
  // For now, let's use a 1000pt milestone as a clear, non-fake target
  const milestone = 1000;
  const progressValue = Math.min((totalPoints / milestone) * 100, 100);
  const remainingForMilestone = Math.max(milestone - totalPoints, 0);

  // Dynamic titles with i18n fallbacks
  const displayEventTitle = eventTitle || urgentHackathon?.name || t('brand.title');
  const displayEventSubtitle = eventSubtitle || (urgentHackathon ? t('dashboard.hero.roadTo', { goal: nextGoal || t('dashboard.hero.nextGoalDefault') }) : t('dashboard.hero.defaultSubtitle'));
  const displayNextGoal = nextGoal || t('dashboard.hero.nextGoalDefault');

  return (
    <section className={styles.surfaceFeatured} aria-label="Dashboard Hero">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
        
        {/* Left Side: Content */}
        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 animate-in fade-in slide-in-from-left-4 duration-500">
              <Rocket className="w-3.5 h-3.5 mr-2" />
              <span className="font-bold tracking-wide uppercase text-[10px]">
                {displayEventTitle} • {urgentHackathon ? t('dashboard.hero.roadTo', { goal: displayNextGoal }) : t('dashboard.hero.defaultSubtitle')}
              </span>
            </Badge>
            
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
                {t('dashboard.hero.greeting', { name: firstName })}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed font-medium">
                {urgentHackathon 
                  ? displayEventSubtitle 
                  : t('dashboard.hero.defaultSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            {urgentHackathon ? (
              <Link href={`/dashboard/hackathons/${urgentHackathon.id}`}>
                <Button size="lg" className="h-14 px-10 text-base font-bold shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
                  {t('dashboard.hero.continue')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard/hackathons">
                <Button size="lg" className="h-14 px-10 text-base font-bold shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
                  {t('dashboard.hero.explore')}
                  <Trophy className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            )}
            <Link href="/dashboard/challenges">
              <Button size="lg" variant="outline" className="h-14 px-10 text-base font-semibold border-2 hover:bg-muted/50 transition-colors">
                {t('dashboard.hero.viewChallenges')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Side: Stats Widget */}
        <div className="lg:w-[22rem] w-full shrink-0 animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-3xl p-7 shadow-2xl space-y-7 ring-1 ring-white/5">
            
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                  {t('dashboard.hero.rankLabel')}
                </p>
                <p className="text-4xl font-black text-foreground drop-shadow-sm">{rank}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-unad-gold/15 flex items-center justify-center border border-unad-gold/20 shadow-inner">
                <Trophy className="w-7 h-7 text-unad-gold" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground flex items-center uppercase tracking-wider">
                  <Zap className="w-4 h-4 mr-2 text-primary" />
                  {t('dashboard.hero.progressLabel')}
                </span>
                <span className="text-foreground bg-primary/10 px-2 py-0.5 rounded text-[10px]">{totalPoints} / {milestone} PTS</span>
              </div>
              
              <div className="space-y-2">
                <Progress value={progressValue} className="h-2.5 bg-muted/50" />
                <p className="text-[10px] text-muted-foreground font-medium text-center">
                  {remainingForMilestone > 0 
                    ? t('dashboard.hero.pointsMilestone', { points: remainingForMilestone })
                    : t('status.completed')}
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-border/20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20 transition-transform hover:rotate-12">
                  <Target className="w-5 h-5 text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
                    {t('dashboard.hero.nextGoalLabel')}
                  </p>
                  <p className="text-sm font-bold truncate text-foreground/90">
                    {displayNextGoal}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
