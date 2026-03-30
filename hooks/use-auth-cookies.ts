'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Syncs auth state from Zustand store to cookies so middleware can read them.
 * Must be rendered in a client component near the root.
 */
export function useAuthCookies() {
  const accessToken = useAuthStore((s) => s?.accessToken);
  const contextToken = useAuthStore((s) => s?.contextToken);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (accessToken) {
      document.cookie = `hackathon-auth-token=${accessToken}; path=/; SameSite=Lax; max-age=86400`;
    } else {
      document.cookie = 'hackathon-auth-token=; path=/; max-age=0';
    }

    if (contextToken) {
      document.cookie = `hackathon-context-token=${contextToken}; path=/; SameSite=Lax; max-age=86400`;
    } else {
      document.cookie = 'hackathon-context-token=; path=/; max-age=0';
    }
  }, [accessToken, contextToken]);
}
