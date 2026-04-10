'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy } from 'lucide-react';

export interface ScorePopupData {
  points: number;
  label?: string;
}

export function ScorePopup() {
  const [queue, setQueue] = useState<ScorePopupData[]>([]);
  const [current, setCurrent] = useState<ScorePopupData | null>(null);

  const handleEvent = useCallback((e: CustomEvent<ScorePopupData>) => {
    setQueue((prev) => [...prev, e.detail]);
  }, []);

  useEffect(() => {
    window.addEventListener('score-earned' as any, handleEvent);
    return () => window.removeEventListener('score-earned' as any, handleEvent);
  }, [handleEvent]);

  // Process queue
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
    const timer = setTimeout(() => setCurrent(null), 2000);
    return () => clearTimeout(timer);
  }, [current, queue]);

  if (!current) return null;

  return (
    <div className="fixed top-24 right-6 z-[90] pointer-events-none">
      <div className="flex items-center gap-2 bg-card border border-unad-gold/40 rounded-xl px-5 py-3 shadow-lg shadow-unad-gold/10 animate-score-pop">
        <Trophy className="w-5 h-5 text-unad-gold" />
        <span className="text-xl font-bold text-unad-gold">+{current.points}</span>
        <span className="text-sm text-muted-foreground">{current.label ?? 'pts'}</span>
      </div>
    </div>
  );
}
