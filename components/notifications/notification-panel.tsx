'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, useUnreadCount, useMarkRead } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Trophy,
  Users,
  Zap,
  Award,
  FileCheck,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import type { Notification } from '@/types/api';

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  hackathon_start: Zap,
  hackathon_end: Trophy,
  team_invite: Users,
  team_accepted: Users,
  badge_earned: Award,
  submission_graded: FileCheck,
  flash_challenge: Zap,
  leaderboard_update: Trophy,
  hint_response: MessageSquare,
  system_announcement: AlertCircle,
};

function getIcon(type: string) {
  return NOTIFICATION_ICONS[type] || Bell;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

export function NotificationPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: countData } = useUnreadCount();
  const { data: notifData } = useNotifications({ limit: 20 });
  const markRead = useMarkRead();

  const unreadCount = (countData as any)?.unread_count ?? 0;
  const notifications: Notification[] = (notifData as any)?.items ?? (notifData as any) ?? [];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleMarkAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      markRead.mutate(unreadIds);
    }
  }

  function handleNotificationClick(n: Notification) {
    if (!n.is_read) {
      markRead.mutate([n.id]);
    }
    if (n.action_url) {
      router.push(n.action_url);
    }
    setOpen(false);
  }

  return (
    <div ref={panelRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 w-[380px] bg-card border border-border rounded-xl shadow-xl z-50 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <h4 className="text-sm font-semibold">Notificaciones</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline"
              >
                Marcar todo como leído
              </button>
            )}
          </div>
          <Separator />

          {/* Notification List */}
          <ScrollArea className="max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Sin notificaciones
              </div>
            ) : (
              <div className="py-1">
                {notifications.map((n) => {
                  const Icon = getIcon(n.type);
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors ${
                        !n.is_read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className={`mt-0.5 p-1.5 rounded-lg ${
                        !n.is_read ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          n.type === 'flash_challenge' ? 'text-accent' :
                          n.type === 'badge_earned' ? 'text-unad-gold' :
                          !n.is_read ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold' : ''}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                      {n.action_url && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 mt-1 flex-shrink-0" />
                      )}
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="px-4 py-2">
                <button
                  onClick={() => { setOpen(false); router.push('/dashboard/notifications'); }}
                  className="text-xs text-primary hover:underline w-full text-center block"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
