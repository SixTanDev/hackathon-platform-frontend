'use client';

import { useTranslation } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  PlusCircle, 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle2,
  Server,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import type { User, Sede } from '@/types/api';
import type { HealthCheck } from '@/lib/api/admin-services';
import styles from './dashboard-styles.module.css';

interface AdminHeroProps {
  user: User | null;
  currentSedeName: string | null;
  health: HealthCheck | null;
  pendingReviewsCount: number;
  loading?: boolean;
}

export function AdminHero({ 
  user, 
  currentSedeName, 
  health, 
  pendingReviewsCount, 
  loading 
}: AdminHeroProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className={`${styles.surfaceFeatured} h-64 animate-pulse bg-muted opacity-50`} />;
  }

  // Traffic Light Logic
  const status = health?.status === 'healthy' || health?.status === 'ok' 
    ? 'healthy' 
    : (health?.status === 'degraded' || (health?.checks && Object.values(health.checks).some(c => c.status !== 'healthy' && c.status !== 'ok')))
      ? 'attention'
      : 'incident';

  const statusConfig = {
    healthy: {
      label: t('admin.hero.status.healthy'),
      description: t('admin.hero.status.ok'),
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      icon: CheckCircle2
    },
    attention: {
      label: t('admin.hero.status.attention'),
      description: t('admin.hero.status.issue'),
      color: 'text-unad-orange',
      bg: 'bg-unad-orange/10',
      border: 'border-unad-orange/20',
      icon: AlertTriangle
    },
    incident: {
      label: t('admin.hero.status.incident'),
      description: t('admin.hero.status.error'),
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: Activity
    }
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <section className={styles.surfaceFeatured} aria-label="Admin Dashboard Hero">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
        
        {/* Left Side: Operational Info */}
        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-bold tracking-wider uppercase text-[10px]">
                {t('admin.hero.statusLabel', { sede: currentSedeName || t('common.campus') })}
              </Badge>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.color} animate-in fade-in zoom-in duration-500`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">{statusConfig.label}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                {t('admin.hero.greeting')}, {user?.full_name?.split(' ')[0] || 'Admin'}
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed font-medium">
                {statusConfig.description}. {t('dashboard.subtitle', { sede: currentSedeName || t('common.campus') })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link href="/admin/hackathons/create">
              <Button size="lg" className="h-14 px-8 text-base font-bold shadow-xl shadow-primary/20">
                <PlusCircle className="w-5 h-5 mr-2" />
                {t('admin.hero.action.createHackathon')}
              </Button>
            </Link>
            <Link href="/admin/challenges?status=pending">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-bold">
                <ShieldCheck className="w-5 h-5 mr-2" />
                {t('admin.hero.action.approveChallenges')}
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold border-2">
                <Users className="w-5 h-5 mr-2" />
                {t('admin.hero.action.manageUsers')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Side: Attention Widget */}
        <div className="lg:w-80 w-full shrink-0">
          <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-3xl p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                {t('dashboard.recentActivity')}
              </p>
              <Server className="w-4 h-4 text-muted-foreground/40" />
            </div>

            <div className={`p-5 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer ${
              pendingReviewsCount > 0 
                ? 'bg-unad-orange/5 border-unad-orange/20' 
                : 'bg-muted/5 border-border/30'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  pendingReviewsCount > 0 ? 'bg-unad-orange/20' : 'bg-muted/20'
                }`}>
                  <ShieldCheck className={`w-5 h-5 ${pendingReviewsCount > 0 ? 'text-unad-orange' : 'text-muted-foreground'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {t('admin.hero.pendingChallenges', { count: pendingReviewsCount })}
                  </p>
                  <Link href="/admin/challenges?status=pending" className="text-[10px] text-muted-foreground hover:text-primary mt-1 flex items-center gap-1 font-bold uppercase tracking-wider">
                    {t('admin.hero.reviewNow')}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                <span>{t('admin.hero.infrastructure')}</span>
                <span className={statusConfig.color}>{statusConfig.label}</span>
              </div>
              <div className="flex gap-1.5 h-1.5">
                {health?.checks && Object.entries(health.checks).length > 0 ? (
                  Object.entries(health.checks).slice(0, 8).map(([name, info]) => (
                    <div 
                      key={name} 
                      title={`${name}: ${info.status}`}
                      className={`flex-1 rounded-full transition-colors duration-500 ${
                        info.status === 'healthy' || info.status === 'ok' || info.status === 'connected'
                          ? 'bg-green-500/40' 
                          : info.status === 'degraded' || info.status === 'attention' 
                            ? 'bg-unad-orange/40' 
                            : 'bg-red-500/40'
                      }`} 
                    />
                  ))
                ) : (
                  <p className="text-[10px] text-muted-foreground italic w-full text-center">
                    {t('admin.infra.error')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
