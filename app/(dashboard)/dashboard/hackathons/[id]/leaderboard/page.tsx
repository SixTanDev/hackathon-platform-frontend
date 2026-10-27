'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getHackathonLeaderboard } from '@/lib/api/hackathon-services';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { RankChange } from '@/components/gamification/rank-change';
import { Trophy, Medal, Crown, Lightbulb, CheckCircle2, Users, User as UserIcon } from 'lucide-react';
import type { LeaderboardEntry } from '@/types/api';

function PodiumPlace({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const colors = {
    1: { bg: 'bg-unad-gold/20', border: 'border-unad-gold/50', text: 'text-unad-gold', size: 'h-36', label: '1er Puesto - Oro', medal: '🥇' },
    2: { bg: 'bg-slate-300/20', border: 'border-slate-400/50', text: 'text-slate-300', size: 'h-28', label: '2do Puesto - Plata', medal: '🥈' },
    3: { bg: 'bg-amber-700/20', border: 'border-amber-700/50', text: 'text-amber-600', size: 'h-24', label: '3er Puesto - Bronce', medal: '🥉' },
  };
  const c = colors[place];
  const Icon = place === 1 ? Crown : Medal;

  return (
    <div className={`flex flex-col items-center gap-2 ${place === 1 ? 'order-2' : place === 2 ? 'order-1' : 'order-3'}`}>
      <div className={`relative w-16 h-16 rounded-full ${c.bg} border-2 ${c.border} flex items-center justify-center shadow-lg transition-transform hover:scale-105`}>
        <Icon className={`w-8 h-8 ${c.text}`} />
        <span className="absolute -top-1 -right-1 text-base">{c.medal}</span>
      </div>
      <p className="text-sm font-bold truncate max-w-[130px] text-center" title={entry.display_name}>{entry.display_name}</p>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${c.bg} ${c.text} border ${c.border}`}>
        {c.label}
      </span>
      <p className={`text-xl font-black ${c.text}`}>{entry.score.toLocaleString()} pts</p>
      <div className={`w-28 ${c.size} rounded-t-xl ${c.bg} border-t-2 border-x-2 ${c.border} flex flex-col items-center justify-end pb-3 shadow-inner`}>
        <span className={`text-3xl font-black ${c.text}`}>#{place}</span>
      </div>
    </div>
  );
}

export default function HackathonLeaderboardPage() {
  const { id } = useParams<{ id: string }>();
  const userId = useAuthStore((s) => s?.user?.id);
  const [type, setType] = useState<'individual' | 'team'>('individual');

  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.leaderboards.hackathon(id), type],
    queryFn: () => getHackathonLeaderboard(id, type),
    enabled: !!id,
  });

  const entries: LeaderboardEntry[] = Array.isArray(data)
    ? data
    : ((data as any)?.entries ?? []);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-unad-gold" />
            Tabla de Posiciones y Premiación
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Clasificación en tiempo real del hackathon e insignias de podio</p>
        </div>
        <Tabs value={type} onValueChange={(v) => setType(v as any)}>
          <TabsList>
            <TabsTrigger value="individual" className="gap-1.5">
              <UserIcon className="w-3.5 h-3.5" /> Individual
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Equipos
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="flex justify-center gap-6"><Skeleton className="w-28 h-48" /><Skeleton className="w-28 h-56" /><Skeleton className="w-28 h-44" /></div>
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : error ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No se pudo cargar la tabla de posiciones</CardContent></Card>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aún no hay participantes en la tabla</CardContent></Card>
      ) : (
        <>
          {/* Podium for available top ranks */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-4 pt-4 pb-2">
              {top3[1] && <PodiumPlace entry={top3[1]} place={2} />}
              {top3[0] && <PodiumPlace entry={top3[0]} place={1} />}
              {top3[2] && <PodiumPlace entry={top3[2]} place={3} />}
            </div>
          )}

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Clasificación completa y Premiación</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="px-4 py-3 text-left w-20">#</th>
                      <th className="px-4 py-3 text-left">Participante</th>
                      <th className="px-4 py-3 text-right">Puntaje</th>
                      <th className="px-4 py-3 text-right">Resueltos</th>
                      <th className="px-4 py-3 text-right">Pistas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const isMe = entry.user_global_id === userId || entry.team_id === userId;
                      return (
                        <tr
                          key={entry.rank}
                          className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${
                            isMe ? 'bg-primary/5 font-semibold' : ''
                          } ${entry.rank <= 3 ? 'bg-unad-gold/5' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 ${
                              entry.rank === 1 ? 'text-unad-gold font-bold' :
                              entry.rank === 2 ? 'text-slate-300 font-bold' :
                              entry.rank === 3 ? 'text-amber-600 font-bold' : ''
                            }`}>
                              {entry.rank === 1 && <span className="text-base" title="Insignia de Oro">🥇</span>}
                              {entry.rank === 2 && <span className="text-base" title="Insignia de Plata">🥈</span>}
                              {entry.rank === 3 && <span className="text-base" title="Insignia de Bronce">🥉</span>}
                              #{entry.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.display_name}</span>
                              {entry.rank <= 3 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  entry.rank === 1 ? 'bg-unad-gold/20 text-unad-gold border border-unad-gold/40' :
                                  entry.rank === 2 ? 'bg-slate-300/20 text-slate-300 border border-slate-400/40' :
                                  'bg-amber-700/20 text-amber-600 border border-amber-700/40'
                                }`}>
                                  {entry.rank === 1 ? '1er Puesto' : entry.rank === 2 ? '2do Puesto' : '3er Puesto'}
                                </span>
                              )}
                              {isMe && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Tú</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            {entry.score.toLocaleString()} pts
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              {entry.submissions_passed}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Lightbulb className="w-3.5 h-3.5" />
                              {entry.hints_used}
                            </span>
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
