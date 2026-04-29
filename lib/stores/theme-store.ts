import { create } from 'zustand';

type Theme = 'light' | 'dark';

type ThemeStore = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme:
    typeof window !== 'undefined'
      ? ((localStorage.getItem('ui-theme') as Theme) || 'dark')
      : 'dark',

  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('ui-theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));
