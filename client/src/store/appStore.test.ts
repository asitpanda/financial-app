import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './appStore';

describe('useAppStore', () => {
  beforeEach(() => useAppStore.setState({ activeScreen: 'dashboard' }));

  it('starts on the dashboard', () => {
    expect(useAppStore.getState().activeScreen).toBe('dashboard');
  });

  it('updates the active screen', () => {
    useAppStore.getState().navigateTo('transactions');

    expect(useAppStore.getState().activeScreen).toBe('transactions');
  });
});