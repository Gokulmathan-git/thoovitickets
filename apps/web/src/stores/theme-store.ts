import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: next });
    localStorage.setItem('thoovitickets-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  },

  initTheme: () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('thoovitickets-theme') as 'light' | 'dark' | null;
    const preferred = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    set({ theme: preferred });
    document.documentElement.classList.toggle('dark', preferred === 'dark');
  },
}));
