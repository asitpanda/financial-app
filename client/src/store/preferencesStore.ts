import { create } from "zustand";
import type { UserPreferences } from "../features/settings/preferences.types";

interface PreferencesState {
  preferences: UserPreferences | null;
  sessionId: number;
  isSaving: boolean;
  beginSession: (preferences?: UserPreferences | null) => void;
  setPreferences: (sessionId: number, preferences: UserPreferences) => void;
  beginSave: (sessionId: number) => boolean;
  finishSave: (sessionId: number) => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  preferences: null,
  sessionId: 0,
  isSaving: false,
  beginSession: (preferences = null) => set((state) => ({
    preferences,
    sessionId: state.sessionId + 1,
    isSaving: false,
  })),
  setPreferences: (sessionId, preferences) => set((state) =>
    state.sessionId === sessionId ? { preferences } : state,
  ),
  beginSave: (sessionId) => {
    let acquired = false;
    set((state) => {
      if (state.sessionId !== sessionId || state.isSaving) return state;
      acquired = true;
      return { isSaving: true };
    });
    return acquired;
  },
  finishSave: (sessionId) => set((state) =>
    state.sessionId === sessionId ? { isSaving: false } : state,
  ),
}));