import { create } from 'zustand';

export type DialogType =
  | 'confirmDelete'
  | 'addContribution'
  | 'transferMoney'
  | 'markPaid'
  | 'importCsv'
  | null;

export interface DialogState {
  open: boolean;
  type: DialogType;
  payload?: unknown;
}

interface DialogStoreState extends DialogState {
  openDialog: (type: Exclude<DialogType, null>, payload?: unknown) => void;
  closeDialog: () => void;
}

const initialState: DialogState = {
  open: false,
  type: null,
  payload: undefined,
};

export const useDialogStore = create<DialogStoreState>((set) => ({
  ...initialState,
  openDialog: (type, payload) => set({ open: true, type, payload }),
  closeDialog: () => set({ ...initialState }),
}));