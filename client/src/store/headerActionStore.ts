import { create } from 'zustand';
import type { Screen } from './appStore';

export interface HeaderActionConfig {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface HeaderActionState {
  actions: Partial<Record<Screen, HeaderActionConfig>>;
  setAction: (screen: Screen, action: HeaderActionConfig) => void;
  clearAction: (screen: Screen) => void;
}

export const useHeaderActionStore = create<HeaderActionState>((set) => ({
  actions: {},
  setAction: (screen, action) =>
    set((state) => ({
      actions: {
        ...state.actions,
        [screen]: action,
      },
    })),
  clearAction: (screen) =>
    set((state) => {
      const nextActions = { ...state.actions };
      delete nextActions[screen];
      return { actions: nextActions };
    }),
}));