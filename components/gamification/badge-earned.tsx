'use client';

import { useState, useEffect, useCallback } from 'react';
import { Award, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BadgeEarnedData {
  name: string;
  description?: string;
  icon?: string;
}

export function BadgeEarned() {
  const [badge, setBadge] = useState<BadgeEarnedData | null>(null);

  const handleEvent = useCallback((e: CustomEvent<BadgeEarnedData>) => {
    setBadge(e.detail);
  }, []);

  useEffect(() => {
    window.addEventListener('badge-earned' as any, handleEvent);
    return () => window.removeEventListener('badge-earned' as any, handleEvent);
  }, [handleEvent]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!badge) return;
    const timer = setTimeout(() => setBadge(null), 5000);
    return () => clearTimeout(timer);
  }, [badge]);

  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 animate-fade-in">
      <div className="bg-card border border-unad-gold/30 rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4 animate-badge-earn shadow-2xl shadow-unad-gold/20">
        <div className="flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-unad-gold/20 flex items-center justify-center">
            <Award className="w-10 h-10 text-unad-gold" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-unad-gold uppercase tracking-wide">¡Insignia Obtenida!</p>
          <h3 className="text-xl font-bold mt-1">{badge.name}</h3>
          {badge.description && (
            <p className="text-sm text-muted-foreground mt-2">{badge.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setBadge(null)} className="mt-2">
          <X className="w-4 h-4 mr-1" /> Cerrar
        </Button>
      </div>
    </div>
  );
}
