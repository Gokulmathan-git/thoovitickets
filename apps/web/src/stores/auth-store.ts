import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserResponse } from '@thoovitickets/shared';

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  isLoading: boolean;
  _hasHydrated: boolean;
  setUser: (user: UserResponse | null) => void;
  setAccessToken: (token: string | null) => void;
  setAuth: (user: UserResponse, accessToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoading: true,
      _hasHydrated: false,

      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setAuth: (user, accessToken) => set({ user, accessToken, isLoading: false }),
      logout: () => set({ user: null, accessToken: null, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
    }),
    {
      name: 'thoovitickets-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          state.setLoading(false);
        }
      },
    },
  ),
);
