import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import {
  createProviderBackedBinding,
  isDatabaseBackedProvider,
  resolveDbProvider,
  resolveDbProviderFromConfig,
  selectRepositoryByProvider,
} from './db-provider';

describe('db-provider', () => {
  describe('resolveDbProvider', () => {
    it.each([
      ['mock', 'mock'],
      [' SUPABASE ', 'supabase'],
      ['postgres', 'postgres'],
      ['postgresql', 'postgres'],
      ['postgress', 'postgres'],
    ])('resolves %s as %s', (rawProvider, expectedProvider) => {
      expect(resolveDbProvider(rawProvider)).toBe(expectedProvider);
    });

    it.each([undefined, '', '   '])('rejects a missing provider value: %s', (rawProvider) => {
      expect(() => resolveDbProvider(rawProvider)).toThrow(
        'DB_PROVIDER is required. Set it explicitly to one of: mock, postgres, supabase.',
      );
    });

    it('rejects an unsupported provider and reports the supplied value', () => {
      expect(() => resolveDbProvider('mysql')).toThrow(
        'Invalid DB_PROVIDER value "mysql". Use one of: mock, postgres, supabase.',
      );
    });
  });

  describe('resolveDbProviderFromConfig', () => {
    it('reads DB_PROVIDER from configuration before resolving it', () => {
      const config = { get: vi.fn().mockReturnValue('postgresql') };

      expect(resolveDbProviderFromConfig(config)).toBe('postgres');
      expect(config.get).toHaveBeenCalledWith('DB_PROVIDER');
    });
  });

  describe('isDatabaseBackedProvider', () => {
    it.each([
      [false, 'mock'],
      [true, 'postgres'],
      [true, 'supabase'],
    ] as const)('returns %s for the %s provider', (expected, provider) => {
      expect(isDatabaseBackedProvider(provider)).toBe(expected);
    });
  });

  describe('selectRepositoryByProvider', () => {
    it.each([
      ['mock', 'mock repository'],
      ['postgres', 'database repository'],
      ['supabase', 'database repository'],
    ] as const)('selects the %s repository for the configured provider', (provider, expected) => {
      expect(
        selectRepositoryByProvider(provider, 'database repository', 'mock repository'),
      ).toBe(expected);
    });
  });

  describe('createProviderBackedBinding', () => {
    it('selects the configured repository and logs the selected provider', () => {
      class DatabaseRepository {}
      class MockRepository {}
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const binding = createProviderBackedBinding({
        token: 'REPOSITORY',
        databaseToken: DatabaseRepository,
        mockToken: MockRepository,
        logLabel: 'Investments',
      });
      const databaseRepository = { kind: 'database' };
      const mockRepository = { kind: 'mock' };
      const factory = (binding as { useFactory: (...args: unknown[]) => unknown }).useFactory;

      expect(
        factory(
          { get: vi.fn().mockReturnValue('supabase') } as unknown as ConfigService,
          databaseRepository,
          mockRepository,
        ),
      ).toBe(databaseRepository);
      expect(log).toHaveBeenCalledWith('Investments using supabase repository');
    });
  });
});