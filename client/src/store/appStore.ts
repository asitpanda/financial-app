import { create } from 'zustand';
import type { Screen } from '../routing/screenRegistry';

export type { Screen } from '../routing/screenRegistry';

interface AppState {
  activeScreen: Screen;
  navigateTo: (screen: Screen) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeScreen: 'dashboard',
  navigateTo: (screen) => set({ activeScreen: screen }),
}));