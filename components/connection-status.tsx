'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ConnectionState } from '@/lib/websocket/types';
import { Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConnectionStatusProps {
  state: ConnectionState;
  onRetry?: () => void;
  /** Only shows when there's an active reason (e.g. live hackathon) */
  visible?: boolean;
}

export function ConnectionStatus({ state, onRetry, visible = true }: ConnectionStatusProps) {
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed when state changes
  useEffect(() => {
    if (state !== 'CONNECTED') setDismissed(false);
  }, [state]);

  // Visual badge globally suppressed — connection logic still runs in the background
  return null;

  if (!visible || dismissed) return null;

  // Don't show when fully connected (clean state)
  if (state === 'CONNECTED') {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border text-xs font-medium transition-colors ${
                state === 'CONNECTING'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                  : 'bg-red-500/10 border-red-500/30 text-red-500'
              }`}
            >
              {state === 'CONNECTING' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Reconectando...</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Sin conexión en tiempo real</span>
                  {onRetry && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-[10px] ml-1"
                      onClick={onRetry}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reintentar
                    </Button>
                  )}
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            {state === 'CONNECTING'
              ? 'Intentando restablecer la conexión en tiempo real...'
              : 'La conexión en tiempo real se ha perdido. Los datos se actualizarán automáticamente al reconectar.'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

/**
 * Small inline indicator dot for headers/navbars.
 * Shows green/amber/red dot based on connection state.
 */
export function ConnectionDot({ state }: { state: ConnectionState }) {
  const color =
    state === 'CONNECTED'
      ? 'bg-green-500'
      : state === 'CONNECTING'
        ? 'bg-amber-500 animate-pulse'
        : 'bg-red-500';

  const label =
    state === 'CONNECTED'
      ? 'Conectado en tiempo real'
      : state === 'CONNECTING'
        ? 'Reconectando...'
        : 'Sin conexión';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="text-xs">{label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
