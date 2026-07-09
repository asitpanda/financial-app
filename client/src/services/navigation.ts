import { useAppStore, type Screen } from '../store/appStore';
import {
  useDrawerStore,
  type DrawerMode,
  type DrawerStep,
  type DrawerType,
} from '../store/drawerStore';
import { useDialogStore, type DialogType } from '../store/dialogStore';

export const navigateTo = (screen: Screen) => {
  useAppStore.getState().navigateTo(screen);
};

export const openDrawer = (payload: {
  type: Exclude<DrawerType, null>;
  mode: Exclude<DrawerMode, null>;
  entityId?: string;
  step?: Exclude<DrawerStep, null>;
}) => {
  useDrawerStore.getState().openDrawer(payload);
};

export const patchDrawer = (payload: {
  type?: DrawerType;
  mode?: DrawerMode;
  entityId?: string;
  step?: DrawerStep;
}) => {
  useDrawerStore.getState().patchDrawer(payload);
};

export const closeDrawer = () => {
  useDrawerStore.getState().closeDrawer();
};

export const openDialog = (
  type: Exclude<DialogType, null>,
  payload?: unknown
) => {
  useDialogStore.getState().openDialog(type, payload);
};

export const closeDialog = () => {
  useDialogStore.getState().closeDialog();
};