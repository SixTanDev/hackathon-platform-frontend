'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NetworkErrorProps {
  onRetry?: () => void;
  message?: string;
}

export function NetworkError({ onRetry, message }: NetworkErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
        <WifiOff className="w-6 h-6 text-orange-500" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Sin conexión</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {message ?? 'Verifica tu conexión a internet e intenta de nuevo.'}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
