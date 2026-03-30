'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const VARIANT_STYLES: Record<StatusVariant, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-secondary/10 text-secondary border-secondary/20',
  warning: 'bg-unad-gold/10 text-unad-gold border-unad-gold/20',
  danger: 'bg-red-500/10 text-red-500 border-red-500/20',
  info: 'bg-unad-teal/10 text-unad-teal border-unad-teal/20',
  muted: 'bg-muted text-muted-foreground border-border',
};

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ label, variant = 'default', className, dot = false }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-medium',
        VARIANT_STYLES[variant ?? 'default'] ?? '',
        className
      )}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      )}
      {label ?? ''}
    </Badge>
  );
}
