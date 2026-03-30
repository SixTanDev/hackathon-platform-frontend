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
    1: { bg: 'bg-unad-gold/20', border: 'border-unad-gold/40', text: 'text-unad-gold', size: 'h-32' },
    2: { bg: 'bg-slate-300/20', border: 'border-slate-400/40', text: 'text-slate-300', size: 'h-24' },
    3: { bg: 'bg-amber-700/20', border: 'border-amber-700/40', text: 'text-amber-600', size: 'h-20' },
  };
  const c = colors[place];
  const Icon = place === 1 ? Crown : Medal;

  return (
    <div className={`flex flex-col items-center gap-2 ${place === 1 ? 'order-2' : place === 2 ? 'order-1' : 'order-3'}`}>
      <div className={`w-14 h-14 rounded-full ${c.bg} border-2 ${c.border} flex items-center justify-center animate-bounce-in`}>
        <Icon className={`w-6 h-6 ${c.text}`} />
      </div>
      <p className="text-sm font-bold truncate max-w-[120px] text-center">{entry.display_name}</p>
      <p className={`text-lg font-extrabold ${c.text}`}>{entry.score.toLocaleString()}</p>
      <div className={`w-24 ${c.size} rounded-t-lg ${c.bg} border ${c.border} flex items-end justify-center pb-2`}>
        <span className={`text-2xl font-black ${c.text}`}>#{place}</span>
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

  const entries: LeaderboardEntry[] = (data as any)?.entries ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-unad-gold" />
            Tabla de Posiciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Clasificación en tiempo real del hackathon</p>
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
          {/* Podium */}
          {top3.length >= 3 && (
            <div className="flex items-end justify-center gap-4 pt-4 pb-2">
              <PodiumPlace entry={top3[1]} place={2} />
              <PodiumPlace entry={top3[0]} place={1} />
              <PodiumPlace entry={top3[2]} place={3} />
            </div>
          )}

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Clasificación completa</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="px-4 py-3 text-left w-16">#</th>
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
                            <span className={`inline-flex items-center gap-1 ${
                              entry.rank === 1 ? 'text-unad-gold font-bold' :
                              entry.rank === 2 ? 'text-slate-300 font-bold' :
                              entry.rank === 3 ? 'text-amber-600 font-bold' : ''
                            }`}>
                              {entry.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{entry.display_name}</span>
                              {isMe && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Tú</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            {entry.score.toLocaleString()}
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
