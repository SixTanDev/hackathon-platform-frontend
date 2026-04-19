'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getSedeLeaderboard, getZoneLeaderboard } from '@/lib/api/hackathon-services';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { StreakIndicator } from '@/components/gamification/streak-indicator';
import { Trophy, Award, MapPin, Globe, AlertCircle } from 'lucide-react';
import type { LeaderboardEntryResponse } from '@/types/api';

function LeaderboardTable({ entries, currentUserId }: { entries: LeaderboardEntryResponse[]; currentUserId?: string }) {
  if (entries.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        No hay datos disponibles aún
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md">
      <table className="w-full text-xs sm:text-sm min-w-[400px]">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-4 py-3 text-left w-16">#</th>
            <th className="px-4 py-3 text-left">Miembro</th>
            <th className="px-4 py-3 text-right">Puntaje</th>
            <th className="px-4 py-3 text-right">Insignias</th>
            <th className="px-4 py-3 text-right">Racha</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isMe = entry.member_id === currentUserId;
            return (
              <tr
                key={entry.rank}
                className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${
                  isMe ? 'bg-primary/5 font-semibold' : ''
                } ${entry.rank <= 3 ? 'bg-unad-gold/5' : ''}`}
              >
                <td className="px-4 py-3">
                  <span className={`${
                    entry.rank === 1 ? 'text-unad-gold font-bold' :
                    entry.rank === 2 ? 'text-slate-300 font-bold' :
                    entry.rank === 3 ? 'text-amber-600 font-bold' : ''
                  }`}>
                    {entry.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{entry.member_id}</span>
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
                    <Award className="w-3.5 h-3.5 text-unad-gold" />
                    {entry.badge_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <StreakIndicator days={entry.streak} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SedeLeaderboardPage() {
  const currentSede = useAuthStore((s) => s?.currentSede);
  const userId = useAuthStore((s) => s?.user?.id);
  const [tab, setTab] = useState('sede');

  const sedeQuery = useQuery({
    queryKey: queryKeys.leaderboards.sede(currentSede?.id ?? ''),
    queryFn: () => getSedeLeaderboard(currentSede?.id ?? '', 1, 50),
    enabled: !!currentSede?.id,
    refetchInterval: 60 * 1000,
  });

  const zoneQuery = useQuery({
    queryKey: queryKeys.leaderboards.zone,
    queryFn: () => getZoneLeaderboard(1, 50),
    refetchInterval: 60 * 1000,
  });

  const sedeEntries: LeaderboardEntryResponse[] = (sedeQuery.data as any)?.entries ?? [];
  const zoneEntries: LeaderboardEntryResponse[] = (zoneQuery.data as any)?.entries ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-unad-gold" />
          Tabla de Posiciones
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Clasificación general por sede y zona
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="sede" className="gap-1 sm:gap-1.5 text-xs sm:text-sm">
            <MapPin className="w-3.5 h-3.5" /> Mi Sede
          </TabsTrigger>
          <TabsTrigger value="zone" className="gap-1 sm:gap-1.5 text-xs sm:text-sm">
            <Globe className="w-3.5 h-3.5" /> Mi Zona
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sede" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {currentSede?.name ?? 'Sede'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sedeQuery.isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : sedeQuery.error ? (
                <div className="py-10 text-center text-destructive">
                  <AlertCircle className="w-8 h-8 mx-auto opacity-50 mb-2" />
                  <p className="text-sm">Error al cargar la tabla de la sede</p>
                </div>
              ) : (
                <LeaderboardTable entries={sedeEntries} currentUserId={userId} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zone" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-secondary" />
                Clasificación Zonal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {zoneQuery.isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : zoneQuery.error ? (
                <div className="py-10 text-center text-destructive">
                  <AlertCircle className="w-8 h-8 mx-auto opacity-50 mb-2" />
                  <p className="text-sm">Error al cargar la tabla de la zona</p>
                </div>
              ) : (
                <LeaderboardTable entries={zoneEntries} currentUserId={userId} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
