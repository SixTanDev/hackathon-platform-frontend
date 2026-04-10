'use client';

import { useAuthCookies } from '@/hooks/use-auth-cookies';

export function AuthCookieSync() {
  useAuthCookies();
  return null;
}
