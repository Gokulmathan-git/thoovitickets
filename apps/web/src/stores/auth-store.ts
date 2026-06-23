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

const loadFromStorage = () => {
  if (typeof window === 'undefined') return { user: null, accessToken: null };
  try {
    const stored = localStorage.getItem('thoovitickets-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { user: parsed.user || null, accessToken: parsed.accessToken || null };
    }
  } catch {}
  return { user: null, accessToken: null };
};

const saveToStorage = (user: UserResponse | null, accessToken: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (user && accessToken) {
      localStorage.setItem('thoovitickets-auth', JSON.stringify({ user, accessToken }));
    } else {
      localStorage.removeItem('thoovitickets-auth');
    }
  } catch {}
};

const initial = loadFromStorage();

export const useAuthStore = create<AuthState>((set) => ({
  user: initial.user,
  accessToken: initial.accessToken,
  isLoading: !initial.user,

  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setAuth: (user, accessToken) => {
    saveToStorage(user, accessToken);
    set({ user, accessToken, isLoading: false });
  },
  logout: () => {
    saveToStorage(null, null);
    set({ user: null, accessToken: null, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
