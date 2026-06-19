'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme-store';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme, initTheme } = useThemeStore();

  useEffect(() => { initTheme(); }, [initTheme]);

  return (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-orange-400" />}
    </button>
  );
}
