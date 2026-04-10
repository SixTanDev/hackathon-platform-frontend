'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Zap, X } from 'lucide-react';

export interface FlashChallengeData {
  hackathonId: string;
  challengeId: string;
  title: string;
  duration?: string;
  multiplier: number;
}

export function FlashChallengeAlert() {
  const router = useRouter();
  const [flashData, setFlashData] = useState<FlashChallengeData | null>(null);
  const [visible, setVisible] = useState(false);

  // Listen for flash challenge events (dispatched from notification polling or other sources)
  useEffect(() => {
    const handleFlash = (event: CustomEvent<FlashChallengeData>) => {
      setFlashData(event.detail);
      setVisible(true);
    };

    window.addEventListener('flash-challenge' as any, handleFlash);
    return () => window.removeEventListener('flash-challenge' as any, handleFlash);
  }, []);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleGo = useCallback(() => {
    if (flashData) {
      router.push(`/dashboard/hackathons/${flashData.hackathonId}/challenges/${flashData.challengeId}`);
    }
    setVisible(false);
  }, [flashData, router]);

  if (!visible || !flashData) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 animate-fade-in">
      <div className="bg-card border border-accent/50 rounded-2xl p-8 max-w-md w-full mx-4 text-center space-y-4 animate-bounce-in shadow-2xl shadow-accent/20">
        {/* Lightning Icon */}
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center animate-pulse">
            <Zap className="w-8 h-8 text-accent" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-accent">⚡ RETO RELÁMPAGO ⚡</h2>
          <p className="text-lg font-semibold mt-2">{flashData.title}</p>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm">
          {flashData.duration ? (
            <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
              Duración: {flashData.duration}
            </span>
          ) : null}
          <span className="px-3 py-1 rounded-full bg-accent/10 text-accent font-bold">
            ×{flashData.multiplier} puntos
          </span>
        </div>

        <Button onClick={handleGo} size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <Zap className="w-5 h-5 mr-2" />
          ¡Resolver Ahora!
        </Button>

        <button
          onClick={() => setVisible(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ignorar
        </button>
      </div>
    </div>
  );
}
