import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../store/appStore';
import { useDialogStore } from '../store/dialogStore';
import { useDrawerStore } from '../store/drawerStore';
import {
  closeDialog,
  closeDrawer,
  navigateTo,
  openDialog,
  openDrawer,
  patchDrawer,
} from './navigation';

describe('navigation services', () => {
  beforeEach(() => {
    useAppStore.setState({ activeScreen: 'dashboard' });
    useDialogStore.setState({ open: false, type: null, payload: undefined });
    useDrawerStore.setState({
      open: false,
      type: null,
      mode: null,
      entityId: undefined,
      step: null,
    });
    window.history.replaceState({}, '', '/dashboard');
  });

  it('updates the active screen and browser path', () => {
    navigateTo('transactions');

    expect(useAppStore.getState().activeScreen).toBe('transactions');
    expect(window.location.pathname).toBe('/transactions');
  });

  it('does not add a new history entry when already on the target path', () => {
    navigateTo('dashboard');

    expect(useAppStore.getState().activeScreen).toBe('dashboard');
    expect(window.location.pathname).toBe('/dashboard');
  });

  it('delegates drawer lifecycle operations to the drawer store', () => {
    openDrawer({ type: 'transaction', mode: 'create', step: 'form' });
    patchDrawer({ mode: 'review', step: 'review' });

    expect(useDrawerStore.getState()).toMatchObject({
      open: true,
      type: 'transaction',
      mode: 'review',
      step: 'review',
    });

    closeDrawer();
    expect(useDrawerStore.getState().open).toBe(false);
  });

  it('delegates dialog lifecycle operations to the dialog store', () => {
    openDialog('confirmDelete', { id: 'account-1' });

    expect(useDialogStore.getState()).toMatchObject({
      open: true,
      type: 'confirmDelete',
      payload: { id: 'account-1' },
    });

    closeDialog();
    expect(useDialogStore.getState()).toMatchObject({ open: false, type: null });
  });
});