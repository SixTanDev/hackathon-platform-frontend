import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { getMyProfile } from '@/lib/api/services';

/**
 * Profile (gamification) is tenant-scoped — requires context token.
 * Disabled when user has no active sede context (e.g. SuperAdmin on global pages).
 */
export function useProfile() {
  const hasContext = useAuthStore((s) => !!s.contextToken);
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: getMyProfile,
    staleTime: 60 * 1000,
    enabled: hasContext,
  });
}
