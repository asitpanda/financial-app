import { beforeEach, describe, expect, it } from 'vitest';
import { useDrawerStore } from './drawerStore';

describe('useDrawerStore', () => {
  beforeEach(() =>
    useDrawerStore.setState({ open: false, type: null, mode: null, entityId: undefined, step: null }),
  );

  it('opens a drawer with its complete state', () => {
    useDrawerStore.getState().openDrawer({ type: 'transaction', mode: 'edit', entityId: 'transaction-1', step: 'form' });

    expect(useDrawerStore.getState()).toMatchObject({
      open: true,
      type: 'transaction',
      mode: 'edit',
      entityId: 'transaction-1',
      step: 'form',
    });
  });

  it('patches only the requested drawer fields', () => {
    useDrawerStore.getState().openDrawer({ type: 'goal', mode: 'create', entityId: undefined, step: 'form' });
    useDrawerStore.getState().patchDrawer({ mode: 'review', step: 'review' });

    expect(useDrawerStore.getState()).toMatchObject({ open: true, type: 'goal', mode: 'review', step: 'review' });
  });

  it('closes the drawer and restores the neutral state', () => {
    useDrawerStore.getState().openDrawer({ type: 'account', mode: 'view', entityId: 'account-1', step: 'overview' });
    useDrawerStore.getState().closeDrawer();

    expect(useDrawerStore.getState()).toMatchObject({ open: false, type: null, mode: null, entityId: undefined, step: null });
  });
});