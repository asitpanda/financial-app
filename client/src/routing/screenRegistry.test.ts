import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  getScreenConfig,
  SCREEN_CONFIGS,
  SIDEBAR_SCREEN_CONFIGS,
  type ScreenRenderContext,
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

  it.each([
    ['dashboard', '/dashboard', 'Dashboard'],
    ['transactions', '/transactions', 'Transactions'],
    ['goals', '/goals', 'Goals'],
    ['categories', '/categories', 'Categories'],
    ['investments', '/investments', 'Investments'],
    ['locker', '/locker', 'Locker'],
    ['settings', '/settings', 'Settings'],
  ] as const)('returns the %s screen configuration', (screen, path, label) => {
    expect(getScreenConfig(screen)).toMatchObject({ key: screen, path, label });
  });

  it('forwards transaction navigation from the dashboard screen', () => {
    const onOpenTransactionsFromDashboard = vi.fn();
    const context: ScreenRenderContext = {
      transactionsPrefetch: [],
      transactionsPrefillFilter: null,
      onOpenTransactionsFromDashboard,
    };
    const dashboard = SCREEN_CONFIGS.dashboard.render(context) as ReactElement<{
      onOpenTransactionsFromDashboard: typeof onOpenTransactionsFromDashboard;
    }>;

    expect(dashboard.props.onOpenTransactionsFromDashboard).toBe(
      onOpenTransactionsFromDashboard,
    );
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