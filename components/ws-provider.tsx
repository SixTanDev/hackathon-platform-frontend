'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useWSNotifications, type ConnectionState } from '@/lib/websocket/hooks';
import { ConnectionStatus } from '@/components/connection-status';
import { useToast } from '@/hooks/use-toast';
import type { NotificationPayload } from '@/lib/websocket/types';

interface WSContextValue {
  /** Global notification WS connection state */
  notificationState: ConnectionState;
  /** Real-time unread count from WS */
  wsUnreadCount: number;
  /** Mark WS notifications as read */
  markWSRead: (ids: string[]) => void;
}

const WSContext = createContext<WSContextValue>({
  notificationState: 'DISCONNECTED',
  wsUnreadCount: 0,
  markWSRead: () => {},
});

export function useWSContext() {
  return useContext(WSContext);
}

export function WSProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { toast } = useToast();

  // Only connect WS if authenticated
  const {
    notifications: wsNotifications,
    unreadCount: wsUnreadCount,
    markAsRead: markWSRead,
    connectionState: notificationState,
  } = useWSNotifications();

  // Listen for high-priority notification events and show toasts
  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent<NotificationPayload>).detail;
      if (!data) return;
      toast({
        title: data.title,
        description: data.message,
        variant: data.priority === 'urgent' ? 'destructive' : 'default',
      });
    };

    window.addEventListener('ws-notification', handler);
    return () => window.removeEventListener('ws-notification', handler);
  }, [toast]);

  // Show connection status only when authenticated
  const showStatus = isAuthenticated && notificationState !== 'CONNECTED';

  const contextValue = useMemo(() => ({
    notificationState,
    wsUnreadCount,
    markWSRead,
  }), [notificationState, wsUnreadCount, markWSRead]);

  return (
    <WSContext.Provider value={contextValue}>
      {children}
      {showStatus && (
        <ConnectionStatus
          state={notificationState}
          visible={isAuthenticated}
        />
      )}
    </WSContext.Provider>
  );
}
