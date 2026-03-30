import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RoleName } from '@/types/api';

export interface ImpersonationState {
  isImpersonating: boolean;
  impersonatedUser: {
    id: string;
    full_name: string;
    email: string;
    role: RoleName;
    sede_name: string;
  } | null;
  originalTokens: {
    accessToken: string;
    refreshToken: string;
    contextToken: string | null;
  } | null;
  /** Saved superadmin zone so we can restore it after impersonation ends */
  originalSuperadminZone: { id: string; code: string; name: string } | null;
  /** Saved superadmin user so we can restore identity */
  originalUser: { id: string; email: string; full_name: string; is_superadmin: boolean } | null;

  startImpersonation: (params: {
    impersonatedUser: ImpersonationState['impersonatedUser'];
    originalTokens: ImpersonationState['originalTokens'];
    originalSuperadminZone?: ImpersonationState['originalSuperadminZone'];
    originalUser?: ImpersonationState['originalUser'];
  }) => void;
  endImpersonation: () => void;
}

export const useImpersonationStore = create<ImpersonationState>()(
  persist(
    (set) => ({
      isImpersonating: false,
      impersonatedUser: null,
      originalTokens: null,
      originalSuperadminZone: null,
      originalUser: null,

      startImpersonation: ({ impersonatedUser, originalTokens, originalSuperadminZone, originalUser }) =>
        set({
          isImpersonating: true,
          impersonatedUser,
          originalTokens,
          originalSuperadminZone: originalSuperadminZone ?? null,
          originalUser: originalUser ?? null,
        }),

      endImpersonation: () =>
        set({
          isImpersonating: false,
          impersonatedUser: null,
          originalTokens: null,
          originalSuperadminZone: null,
          originalUser: null,
        }),
    }),
    {
      name: 'hackathon-impersonation',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      }),
    }
  )
);
