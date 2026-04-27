'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/stores/theme-store';

export function ThemeInitializer() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return null;
}
