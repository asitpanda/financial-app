import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    $connect() {
      return Promise.resolve();
    }

    $disconnect() {
      return Promise.resolve();
    }

    $on() {}
  },
}));

import { PrismaService } from './prisma.service';

type QueryLogEvent = {
  query: string;
  params: string;
  duration: number;
};

function createPrismaService(values: Record<string, string | undefined>) {
  const configService = {
    get: vi.fn((key: string, defaultValue?: string) => values[key] ?? defaultValue),
  } as unknown as ConfigService;
  const service = new PrismaService(configService);

  return { service, configService };
}

describe('PrismaService', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('onModuleInit', () => {
    it('skips the database connection for the mock provider', async () => {
      const { service } = createPrismaService({ DB_PROVIDER: 'mock' });
      const connect = vi.spyOn(service, '$connect').mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connect).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith('✅ Using mock provider (no database connection)');
    });

    it('connects for a database provider and logs compact JSON query events with truncated params', async () => {
      const { service } = createPrismaService({
        DB_PROVIDER: 'postgres',
        LOG_FORMAT: 'json',
        DB_QUERY_LOG_MAX_PARAMS: '4',
      });
      const connect = vi.spyOn(service, '$connect').mockResolvedValue(undefined);
      let queryListener: ((event: QueryLogEvent) => void) | undefined;
      vi.spyOn(service, '$on').mockImplementation(((event: string, callback: (payload: QueryLogEvent) => void) => {
        if (event === 'query') queryListener = callback;
      }) as never);

      await service.onModuleInit();
      queryListener?.({ query: ' SELECT  *\nFROM accounts ', params: '123456', duration: 12 });

      expect(connect).toHaveBeenCalledOnce();
      expect(log).toHaveBeenCalledWith(
        JSON.stringify({
          tag: 'DB',
          query: 'SELECT * FROM accounts',
          params: '1234...<truncated>',
          durationMs: 12,
          provider: 'postgres',
        }),
      );
      expect(log).toHaveBeenCalledWith('✅ Database connected');
    });

    it('logs compact query events in the default text format', async () => {
      const { service } = createPrismaService({ DB_PROVIDER: 'postgres' });
      vi.spyOn(service, '$connect').mockResolvedValue(undefined);
      let queryListener: ((event: QueryLogEvent) => void) | undefined;
      vi.spyOn(service, '$on').mockImplementation(((event: string, callback: (payload: QueryLogEvent) => void) => {
        if (event === 'query') queryListener = callback;
      }) as never);

      await service.onModuleInit();
      queryListener?.({ query: ' SELECT *\nFROM goals ', params: '[]', duration: 5 });

      expect(log).toHaveBeenCalledWith('[DB] query=SELECT * FROM goals params=[] duration=5ms');
    });

    it('connects without registering query logging when query logs are disabled', async () => {
      const { service } = createPrismaService({
        DB_PROVIDER: 'supabase',
        LOG_DB_QUERIES: 'false',
      });
      const connect = vi.spyOn(service, '$connect').mockResolvedValue(undefined);
      const on = vi.spyOn(service, '$on');

      await service.onModuleInit();

      expect(connect).toHaveBeenCalledOnce();
      expect(on).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalledWith('🧾 DB query logging enabled');
    });
  });

  describe('onModuleDestroy', () => {
    it('disconnects from database-backed providers', async () => {
      const { service } = createPrismaService({ DB_PROVIDER: 'postgres' });
      const disconnect = vi.spyOn(service, '$disconnect').mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(disconnect).toHaveBeenCalledOnce();
    });

    it('does not disconnect for the mock provider', async () => {
      const { service } = createPrismaService({ DB_PROVIDER: 'mock' });
      const disconnect = vi.spyOn(service, '$disconnect').mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(disconnect).not.toHaveBeenCalled();
    });
  });
});