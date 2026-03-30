'use client';

import { Flame } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StreakIndicatorProps {
  days: number;
  className?: string;
}

export function StreakIndicator({ days, className = '' }: StreakIndicatorProps) {
  if (days <= 0) return null;

  const intensity =
    days >= 30 ? 'text-red-500' :
    days >= 14 ? 'text-unad-orange' :
    days >= 7 ? 'text-unad-gold' :
    'text-muted-foreground';

  const glowClass = days >= 7 ? 'animate-pulse-glow' : '';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 ${glowClass} ${className}`}>
            <Flame className={`w-4 h-4 ${intensity}`} />
            <span className={`text-sm font-bold ${intensity}`}>{days}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Racha de {days} día{days !== 1 ? 's' : ''} consecutivo{days !== 1 ? 's' : ''}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
