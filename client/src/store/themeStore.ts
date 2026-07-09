import { create } from 'zustand';

export type AppThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'app-theme-mode';

const getInitialMode = (): AppThemeMode => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'dark' ? 'dark' : 'light';
};

interface ThemeState {
  mode: AppThemeMode;
  setMode: (mode: AppThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: getInitialMode(),
  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    set({ mode });
  },
  toggleMode: () =>
    set((state) => {
      const nextMode: AppThemeMode = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, nextMode);
      return { mode: nextMode };
    }),
}));
