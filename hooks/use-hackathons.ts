import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { getHackathons, type HackathonListParams } from '@/lib/api/services';

/**
 * Hackathons are tenant-scoped — they require a context token + zone id.
 * Queries are disabled when the user has no active context.
 */
export function useHackathons(params?: HackathonListParams) {
  const hasContext = useAuthStore((s) => !!s.contextToken);
  return useQuery({
    queryKey: queryKeys.hackathons.list(params as Record<string, unknown>),
    queryFn: () => getHackathons(params),
    enabled: hasContext,
  });
}

export function useActiveHackathons() {
  return useHackathons({ status: 'active', limit: 5 });
}

export function useOpenHackathons() {
  return useHackathons({ status: 'registration_open', limit: 5 });
}
