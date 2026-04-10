import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, RoleName, ZoneMembershipInfo } from '@/types/api';

export interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  contextToken: string | null;
  currentZone: { id: string; code: string; name: string } | null;
  currentSede: { id: string; name: string; slug: string } | null;
  currentRole: RoleName | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  memberships: ZoneMembershipInfo[];
  /** Zone selected by superadmin for cross-zone management (not tied to context token) */
  superadminSelectedZone: { id: string; code: string; name: string } | null;

  // Actions
  login: (user: User, accessToken: string, refreshToken: string) => void;
  setMemberships: (memberships: ZoneMembershipInfo[]) => void;
  selectContext: (params: {
    contextToken: string;
    zone: { id: string; code: string; name: string };
    sede: { id: string; name: string; slug: string };
    role: RoleName;
  }) => void;
  logout: () => void;
  refreshSession: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: User) => void;
  /** Set the zone selected by superadmin for cross-zone ops (does NOT require context token) */
  setSuperadminZone: (zone: { id: string; code: string; name: string } | null) => void;
}

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  contextToken: null,
  currentZone: null,
  currentSede: null,
  currentRole: null,
  isAuthenticated: false,
  isLoading: false,
  memberships: [],
  superadminSelectedZone: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      login: (user: User, accessToken: string, refreshToken: string) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      setMemberships: (memberships: ZoneMembershipInfo[]) =>
        set({ memberships }),

      selectContext: ({ contextToken, zone, sede, role }) =>
        set({
          contextToken,
          currentZone: zone,
          currentSede: sede,
          currentRole: role,
        }),

      logout: () => set({ ...initialState }),

      refreshSession: (accessToken: string, refreshToken: string) =>
        set({ accessToken, refreshToken }),

      setLoading: (isLoading: boolean) => set({ isLoading }),

      setUser: (user: User) => set({ user }),

      setSuperadminZone: (zone) => set({ superadminSelectedZone: zone }),
    }),
    {
      name: 'hackathon-auth',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // SSR fallback: return a no-op storage
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state: AuthState) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        contextToken: state.contextToken,
        currentZone: state.currentZone,
        currentSede: state.currentSede,
        currentRole: state.currentRole,
        isAuthenticated: state.isAuthenticated,
        memberships: state.memberships,
        superadminSelectedZone: state.superadminSelectedZone,
      }),
    }
  )
);
