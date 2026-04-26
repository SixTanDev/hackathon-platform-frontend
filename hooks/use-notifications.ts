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

 * Global flag to enable/disable notifications service
 */
const IS_NOTIFICATIONS_ENABLED = false;

/**
 * Notifications are tenant-scoped — they require a context token.
 * Queries are disabled when the user has no active context (e.g. SuperAdmin on global pages).
 */
export function useNotifications(params?: NotificationListParams) {
  const hasContext = useAuthStore((s) => !!s.contextToken);
  return useQuery({
    queryKey: queryKeys.notifications.list(params as Record<string, unknown>),
    queryFn: () => getNotifications(params),
    enabled: IS_NOTIFICATIONS_ENABLED && hasContext,
  });
}

export function useUnreadCount() {
  const hasContext = useAuthStore((s) => !!s.contextToken);
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: getUnreadNotificationCount,
    refetchInterval: (IS_NOTIFICATIONS_ENABLED && hasContext) ? 30 * 1000 : false,
    staleTime: 60 * 1000, 
    refetchOnMount: false, // Don't refetch on component mount if we have data
    refetchOnWindowFocus: false, // Avoid storm when switching tabs
    enabled: IS_NOTIFICATIONS_ENABLED && hasContext,
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
