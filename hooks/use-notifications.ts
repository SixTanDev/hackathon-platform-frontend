import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
  type NotificationListParams,
} from '@/lib/api/services';

/**
 * Notifications are tenant-scoped — they require a context token.
 * Queries are disabled when the user has no active context (e.g. SuperAdmin on global pages).
 */
export function useNotifications(params?: NotificationListParams) {
  const hasContext = useAuthStore((s) => !!s.contextToken);
  return useQuery({
    queryKey: queryKeys.notifications.list(params as Record<string, unknown>),
    queryFn: () => getNotifications(params),
    enabled: hasContext,
  });
}

export function useUnreadCount() {
  const hasContext = useAuthStore((s) => !!s.contextToken);
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: getUnreadNotificationCount,
    refetchInterval: hasContext ? 30 * 1000 : false,
    enabled: hasContext,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
