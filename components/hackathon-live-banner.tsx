'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useCountdown } from '@/hooks/use-countdown';
import { getHackathons } from '@/lib/api/services';
import { getHackathonRegistrations, getHackathonLeaderboard } from '@/lib/api/hackathon-services';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Radio, ArrowRight, Trophy } from 'lucide-react';
import type { Hackathon } from '@/types/api';

function BannerCountdown({ endsAt }: { endsAt: string | null }) {
  const countdown = useCountdown(endsAt);
  if (!endsAt || countdown.isExpired) return <span>Finalizado</span>;
  return <span className="font-mono">{countdown.formatted}</span>;
}

export function HackathonLiveBanner() {
  const userId = useAuthStore((s) => s?.user?.id);
  const isAuthenticated = useAuthStore((s) => s?.isAuthenticated);
  const [activeEnrolled, setActiveEnrolled] = useState<Hackathon | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  // Fetch active live hackathons
  const { data: activeHackathons } = useQuery({
    queryKey: ['live-banner-hackathons'],
    queryFn: () => getHackathons({ status: 'active', limit: 10 }),
    enabled: isAuthenticated,
    refetchInterval: 60 * 1000,
    staleTime: 5 * 60 * 1000, // Keep fresh for 5 mins
  });

  const currentRole = useAuthStore((s) => s?.currentRole);
  const isParticipantRole = currentRole === 'student' || currentRole === 'guest';

  // Check enrollment for active live hackathons
  useEffect(() => {
    // Admins and Tutors don't usually participate in live hackathons as students
    // We disable this heavy check for them to save API resources
    if (!activeHackathons?.length || !userId || !isParticipantRole) {
      setActiveEnrolled(null);
      setMyRank(null);
      return;
    }

    const liveHackathons = activeHackathons.filter((h) => h.mode === 'live');
    if (!liveHackathons.length) {
      setActiveEnrolled(null);
      return;
    }

    // Use an AbortController or a simple mounted flag to avoid state updates on unmounted component
    let isMounted = true;

    const checkEnrollments = async () => {
      for (const h of liveHackathons) {
        if (!isMounted) break;
        try {
          // We could use React Query here, but since it's a Sequential check to find the FIRST 
          // one, we keep it as a controlled async loop for now but with better guardrails.
          const regs = await getHackathonRegistrations(h.id);
          const myReg = regs?.find?.((r) => r.user_global_id === userId && r.status !== 'cancelled');
          
          if (myReg && isMounted) {
            setActiveEnrolled(h);
            // Get rank
            try {
              const lb = await getHackathonLeaderboard(h.id, 'individual');
              const myEntry = lb?.find?.((e) => e.user_global_id === userId);
              setMyRank(myEntry?.rank ?? null);
            } catch {
              setMyRank(null);
            }
            return;
          }
        } catch (err) {
          console.error(`Error checking enrollment for ${h.id}:`, err);
        }
      }
      if (isMounted) setActiveEnrolled(null);
    };

    checkEnrollments();

    return () => {
      isMounted = false;
    };
  }, [activeHackathons, userId, isParticipantRole]);

  if (!activeEnrolled) return null;

  return (
    <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <Radio className="w-4 h-4 text-red-500" />
          <span className="font-medium">Hackathon en Vivo:</span>
          <span className="font-semibold truncate max-w-[200px]">{activeEnrolled.name}</span>
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground">Tiempo restante: </span>
          <BannerCountdown endsAt={activeEnrolled.ends_at} />
          {myRank ? (
            <>
              <span className="text-muted-foreground">—</span>
              <span className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-unad-gold" />
                Tu puesto: <span className="font-bold">#{myRank}</span>
              </span>
            </>
          ) : null}
        </div>
        <Link href={`/dashboard/hackathons/${activeEnrolled.id}`}>
          <Button size="sm" variant="destructive" className="text-xs">
            Entrar <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
