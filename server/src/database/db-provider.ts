import { Provider, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type DbProvider = 'mock' | 'supabase' | 'postgres';

export const DB_PROVIDER_ENV_KEY = 'DB_PROVIDER';
export const DEFAULT_DB_PROVIDER: DbProvider = 'mock';

type ProviderConfigReader = {
  get<T = string>(propertyPath: string): T | undefined;
};

export function resolveDbProvider(rawProvider?: string): DbProvider {
  const normalized = String(rawProvider ?? DEFAULT_DB_PROVIDER).trim().toLowerCase();

  switch (normalized) {
    case 'mock':
      return 'mock';
    case 'supabase':
      return 'supabase';
    case 'postgres':
    case 'postgresql':
    case 'postgress':
      return 'postgres';
    default:
      return DEFAULT_DB_PROVIDER;
  }
}

export function resolveDbProviderFromConfig(config: ProviderConfigReader): DbProvider {
  return resolveDbProvider(config.get<string>(DB_PROVIDER_ENV_KEY));
}

export function isDatabaseBackedProvider(provider: DbProvider): boolean {
  return provider === 'supabase' || provider === 'postgres';
}

export function selectRepositoryByProvider<T>(
  provider: DbProvider,
  databaseRepository: T,
  mockRepository: T,
): T {
  return isDatabaseBackedProvider(provider) ? databaseRepository : mockRepository;
}

export function createProviderBackedBinding<T, D extends T, M extends T>(params: {
  token: string;
  databaseToken: Type<D>;
  mockToken: Type<M>;
  logLabel?: string;
}): Provider {
  const { token, databaseToken, mockToken, logLabel } = params;

  return {
    provide: token,
    useFactory: (
      configService: ConfigService,
      databaseRepository: T,
      mockRepository: T,
    ) => {
      const dbProvider = resolveDbProviderFromConfig(configService);
      if (logLabel) {
        console.log(`${logLabel} using ${dbProvider} repository`);
      }
      return selectRepositoryByProvider(
        dbProvider,
        databaseRepository,
        mockRepository,
      );
    },
    inject: [ConfigService, databaseToken, mockToken],
  };
}
