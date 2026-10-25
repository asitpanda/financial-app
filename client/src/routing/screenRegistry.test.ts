import { describe, expect, it } from 'vitest';
import {
  getScreenConfig,
  SCREEN_CONFIGS,
  SIDEBAR_SCREEN_CONFIGS,
} from './screenRegistry';

describe('screen registry', () => {
  it('defines a unique route and label for every screen', () => {
    const configs = Object.values(SCREEN_CONFIGS);
    const paths = configs.map(({ path }) => path);
    const labels = configs.map(({ label }) => label);

    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(labels).size).toBe(labels.length);
    configs.forEach((config) => {
      expect(config.path).toMatch(/^\/[a-z-]+$/);
      expect(config.label.trim()).not.toBe('');
      expect(config.icon).toEqual(expect.any(String));
      expect(config.render).toEqual(expect.any(Function));
    });
  });

  it('returns the requested configuration', () => {
    expect(getScreenConfig('transactions')).toMatchObject({
      key: 'transactions',
      path: '/transactions',
      label: 'Transactions',
      showInSidebar: true,
    });
  });

  it('includes every configured screen in the sidebar', () => {
    expect(SIDEBAR_SCREEN_CONFIGS.map(({ key }) => key)).toEqual([
      'dashboard',
      'transactions',
      'goals',
      'categories',
      'investments',
      'locker',
      'settings',
    ]);
  });
});