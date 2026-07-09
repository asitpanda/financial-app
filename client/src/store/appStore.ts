import { create } from 'zustand';

export type Screen =
  | 'dashboard'
  | 'transactions'
  | 'accounts'
  | 'budgets'
  | 'goals'
  | 'categories'
  | 'investments'
  | 'cards'
  | 'reminders'
  | 'settings';

interface AppState {
  activeScreen: Screen;
  navigateTo: (screen: Screen) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeScreen: 'dashboard',
  navigateTo: (screen) => set({ activeScreen: screen }),
}));