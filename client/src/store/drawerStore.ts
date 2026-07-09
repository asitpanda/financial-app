import { create } from 'zustand';

export type DrawerType =
  | 'goal'
  | 'transaction'
  | 'account'
  | 'budget'
  | 'category'
  | 'card'
  | 'reminder'
  | null;

export type DrawerMode = 'view' | 'create' | 'edit' | 'review' | null;

export type DrawerStep =
  | 'overview'
  | 'details'
  | 'form'
  | 'review'
  | 'success'
  | null;

export interface DrawerState {
  open: boolean;
  type: DrawerType;
  mode: DrawerMode;
  entityId?: string;
  step?: DrawerStep;
}

interface DrawerStoreState extends DrawerState {
  openDrawer: (payload: Omit<DrawerState, 'open'>) => void;
  patchDrawer: (payload: Partial<Omit<DrawerState, 'open'>>) => void;
  closeDrawer: () => void;
}

const initialState: DrawerState = {
  open: false,
  type: null,
  mode: null,
  entityId: undefined,
  step: null,
};

export const useDrawerStore = create<DrawerStoreState>((set) => ({
  ...initialState,
  openDrawer: (payload) => set({ open: true, ...payload }),
  patchDrawer: (payload) => set((state) => ({ ...state, ...payload })),
  closeDrawer: () => set({ ...initialState }),
}));