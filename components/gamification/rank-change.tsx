'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RankChangeProps {
  change: number; // positive = improved (went up), negative = dropped
  className?: string;
}

export function RankChange({ change, className = '' }: RankChangeProps) {
  if (change === 0) {
    return (
      <span className={`inline-flex items-center text-muted-foreground ${className}`}>
        <Minus className="w-3.5 h-3.5" />
      </span>
    );
  }

  if (change > 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-emerald-500 animate-rank-change ${className}`}>
        <TrendingUp className="w-3.5 h-3.5" />
        <span className="text-xs font-bold">{change}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 text-red-400 ${className}`}>
      <TrendingDown className="w-3.5 h-3.5" />
      <span className="text-xs font-bold">{Math.abs(change)}</span>
    </span>
  );
}
