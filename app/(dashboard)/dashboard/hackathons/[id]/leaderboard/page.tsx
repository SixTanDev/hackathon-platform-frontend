'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getHackathonLeaderboard, getHackathon } from '@/lib/api/hackathon-services';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { BadgeDownloadDialog } from '@/components/gamification/badge-download-dialog';
import { Trophy, Medal, Crown, Lightbulb, CheckCircle2, Users, User as UserIcon, Sparkles } from 'lucide-react';
import type { LeaderboardEntry } from '@/types/api';

function PodiumPlace({
  entry,
  place,
  hackathonTitle,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  hackathonTitle?: string;
}) {
  const styles = {
    1: {
      circle: 'bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-500 text-amber-600 dark:text-amber-400 shadow-md shadow-amber-500/20',
      badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-600',
      label: '1er Puesto · Oro',
      medal: '🥇',
      pts: 'text-amber-600 dark:text-amber-400',
      pillarHeight: 'h-40',
      pillarBg: 'bg-gradient-to-t from-amber-200/90 via-amber-100/70 to-amber-50/50 dark:from-amber-950/60 dark:via-amber-900/30 dark:to-background border-t-4 border-x-2 border-amber-500 dark:border-amber-500/80 shadow-lg',
      pillarText: 'text-amber-600 dark:text-amber-400',
      order: 'order-2',
    },
    2: {
      circle: 'bg-slate-200 dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200 shadow-md shadow-slate-500/20',
      badge: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600',
      label: '2do Puesto · Plata',
      medal: '🥈',
      pts: 'text-slate-700 dark:text-slate-200',
      pillarHeight: 'h-32',
      pillarBg: 'bg-gradient-to-t from-slate-200/90 via-slate-100/70 to-slate-50/50 dark:from-slate-800/60 dark:via-slate-800/30 dark:to-background border-t-4 border-x-2 border-slate-400 dark:border-slate-500/80 shadow-md',
      pillarText: 'text-slate-700 dark:text-slate-300',
      order: 'order-1',
    },
    3: {
      circle: 'bg-orange-100 dark:bg-orange-950/60 border-2 border-orange-500 text-orange-700 dark:text-orange-400 shadow-md shadow-orange-500/20',
      badge: 'bg-orange-100 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-600',
      label: '3er Puesto · Bronce',
      medal: '🥉',
      pts: 'text-orange-700 dark:text-orange-400',
      pillarHeight: 'h-24',
      pillarBg: 'bg-gradient-to-t from-orange-200/90 via-orange-100/70 to-orange-50/50 dark:from-orange-950/60 dark:via-orange-900/30 dark:to-background border-t-4 border-x-2 border-orange-500 dark:border-orange-500/80 shadow-md',
      pillarText: 'text-orange-700 dark:text-orange-400',
      order: 'order-3',
    },
  };

  const s = styles[place];
  const Icon = place === 1 ? Crown : Medal;

  return (
    <div className={`flex flex-col items-center gap-2 ${s.order} transition-transform hover:-translate-y-1 duration-200`}>
      {/* Medal Icon Crest */}
      <div className={`relative w-16 h-16 rounded-full ${s.circle} flex items-center justify-center`}>
        <Icon className="w-8 h-8" />
        <span className="absolute -top-1.5 -right-1.5 text-lg drop-shadow">{s.medal}</span>
      </div>

      {/* Participant Name */}
      <p className="text-sm font-bold text-foreground truncate max-w-[140px] text-center" title={entry.display_name}>
        {entry.display_name}
      </p>

      {/* Rank Badge */}
      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${s.badge}`}>
        {s.label}
      </span>

      {/* Score */}
      <p className={`text-xl font-black tabular-nums ${s.pts}`}>
        {entry.score.toLocaleString()} pts
      </p>

      {/* Transparent badge download button */}
      <BadgeDownloadDialog
        entry={entry}
        rank={place}
        hackathonTitle={hackathonTitle}
        triggerLabel="Descargar Insignia"
        className="text-[11px] h-7 px-3 rounded-full font-semibold border-border/70 hover:border-unad-gold/70"
      />

      {/* Podium Pillar */}
      <div className={`w-32 ${s.pillarHeight} rounded-t-2xl ${s.pillarBg} flex flex-col items-center justify-end pb-3 mt-1`}>
        <span className={`text-4xl font-black drop-shadow-sm ${s.pillarText}`}>#{place}</span>
      </div>
    </div>
  );
}

export default function HackathonLeaderboardPage() {
  const { id } = useParams<{ id: string }>();
  const userId = useAuthStore((s) => s?.user?.id);
  const [type, setType] = useState<'individual' | 'team'>('individual');

  const { data: hackathon } = useQuery({
    queryKey: queryKeys.hackathons.detail(id),
    queryFn: () => getHackathon(id),
    enabled: !!id,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.leaderboards.hackathon(id), type],
    queryFn: () => getHackathonLeaderboard(id, type),
    enabled: !!id,
  });

  const entries: LeaderboardEntry[] = Array.isArray(data)
    ? data
    : ((data as any)?.entries ?? []);
  const top3 = entries.slice(0, 3);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2.5 text-foreground">
            <Trophy className="w-7 h-7 text-unad-gold" />
            Tabla de Posiciones y Premiación
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hackathon?.name ? <span className="font-semibold text-foreground">{hackathon.name} · </span> : ''}
            Clasificación oficial en tiempo real e insignias institucionales de honor
          </p>
        </div>
        <Tabs value={type} onValueChange={(v) => setType(v as any)}>
          <TabsList className="border border-border/50 bg-muted/40">
            <TabsTrigger value="individual" className="gap-1.5 text-xs">
              <UserIcon className="w-3.5 h-3.5" /> Individual
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" /> Equipos
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="flex justify-center gap-6 pt-8 pb-4">
            <Skeleton className="w-32 h-48 rounded-2xl" />
            <Skeleton className="w-32 h-56 rounded-2xl" />
            <Skeleton className="w-32 h-44 rounded-2xl" />
          </div>
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : error ? (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center text-muted-foreground">
            No se pudo cargar la tabla de posiciones. Por favor, intenta nuevamente.
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center text-muted-foreground">
            Aún no hay participantes en la tabla de posiciones.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Olympic Podium Display */}
          {top3.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card/80 to-muted/20 p-6 shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                <Sparkles className="w-3.5 h-3.5 text-unad-gold" />
                <span>Podio de Ganadores Hackathon</span>
              </div>
              <div className="flex items-end justify-center gap-4 sm:gap-8 pt-4 pb-2">
                {top3[1] && <PodiumPlace entry={top3[1]} place={2} hackathonTitle={hackathon?.name} />}
                {top3[0] && <PodiumPlace entry={top3[0]} place={1} hackathonTitle={hackathon?.name} />}
                {top3[2] && <PodiumPlace entry={top3[2]} place={3} hackathonTitle={hackathon?.name} />}
              </div>
            </div>
          )}

          {/* Full Classification Table */}
          <Card className="border-border/60 overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5">
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <span>Clasificación Completa y Entrega de Insignias</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-5 py-3 text-left w-20">#</th>
                      <th className="px-5 py-3 text-left">Participante</th>
                      <th className="px-5 py-3 text-right">Puntaje</th>
                      <th className="px-5 py-3 text-right">Resueltos</th>
                      <th className="px-5 py-3 text-right">Pistas</th>
                      <th className="px-5 py-3 text-right w-36">Insignia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const isMe = entry.user_global_id === userId || entry.team_id === userId;
                      return (
                        <tr
                          key={entry.rank}
                          className={`border-b border-border/40 transition-colors hover:bg-muted/40 ${
                            isMe ? 'bg-primary/5 font-semibold' : ''
                          } ${entry.rank === 1 ? 'bg-amber-500/5' : entry.rank === 2 ? 'bg-slate-400/5' : entry.rank === 3 ? 'bg-orange-500/5' : ''}`}
                        >
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 font-bold ${
                              entry.rank === 1 ? 'text-amber-600 dark:text-amber-400' :
                              entry.rank === 2 ? 'text-slate-700 dark:text-slate-200' :
                              entry.rank === 3 ? 'text-orange-700 dark:text-orange-400' :
                              'text-muted-foreground'
                            }`}>
                              {entry.rank === 1 && <span className="text-base">🥇</span>}
                              {entry.rank === 2 && <span className="text-base">🥈</span>}
                              {entry.rank === 3 && <span className="text-base">🥉</span>}
                              #{entry.rank}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{entry.display_name}</span>
                              {entry.rank <= 3 && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                                  entry.rank === 1 ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-600' :
                                  entry.rank === 2 ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600' :
                                  'bg-orange-100 dark:bg-orange-950/80 text-orange-900 dark:text-orange-300 border-orange-300 dark:border-orange-600'
                                }`}>
                                  {entry.rank === 1 ? '1er Puesto' : entry.rank === 2 ? '2do Puesto' : '3er Puesto'}
                                </span>
                              )}
                              {isMe && (
                                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-bold">
                                  Tú
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground">
                            {entry.score.toLocaleString()} pts
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {entry.submissions_passed}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Lightbulb className="w-3.5 h-3.5" />
                              {entry.hints_used}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <BadgeDownloadDialog
                              entry={entry}
                              rank={entry.rank}
                              hackathonTitle={hackathon?.name}
                              triggerLabel="Descargar"
                              className="h-7 text-xs px-2.5 rounded-full font-medium"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
