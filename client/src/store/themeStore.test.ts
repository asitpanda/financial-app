import { beforeEach, describe, expect, it } from 'vitest';
import { useThemeStore } from './themeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useThemeStore.setState({ mode: 'light' });
  });

  it('starts in light mode when no mode is persisted', () => {
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('sets and persists dark mode', () => {
    useThemeStore.getState().setMode('dark');

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(sessionStorage.getItem('app-theme-mode')).toBe('dark');
  });

  it('sets and persists light mode', () => {
    useThemeStore.getState().setMode('dark');
    useThemeStore.getState().setMode('light');

    expect(useThemeStore.getState().mode).toBe('light');
    expect(sessionStorage.getItem('app-theme-mode')).toBe('light');
  });

  it('toggles between light and dark modes and persists each transition', () => {
    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(sessionStorage.getItem('app-theme-mode')).toBe('dark');

    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('light');
    expect(sessionStorage.getItem('app-theme-mode')).toBe('light');
  });
});