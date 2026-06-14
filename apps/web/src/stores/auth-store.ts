import { create } from 'zustand';
import type { UserResponse } from '@thoovitickets/shared';

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  isLoading: boolean;
  setUser: (user: UserResponse | null) => void;
  setAccessToken: (token: string | null) => void;
  setAuth: (user: UserResponse, accessToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setAuth: (user, accessToken) => set({ user, accessToken, isLoading: false }),
  logout: () => set({ user: null, accessToken: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
