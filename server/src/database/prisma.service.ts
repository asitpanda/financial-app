import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { isDatabaseBackedProvider, resolveDbProviderFromConfig } from './db-provider';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL'),
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    const dbProvider = resolveDbProviderFromConfig(this.configService);

    // Connect Prisma only for database-backed providers.
    if (isDatabaseBackedProvider(dbProvider)) {
      const shouldLogQueries = this.configService.get<string>('LOG_DB_QUERIES', 'true') !== 'false';
      const maxParamsLength = Number(this.configService.get<string>('DB_QUERY_LOG_MAX_PARAMS', '800'));
      const isJsonLogFormat =
        String(this.configService.get<string>('LOG_FORMAT', '')).toLowerCase() === 'json';

      if (shouldLogQueries) {
        (this as any).$on('query', (event: any) => {
          const compactQuery = String(event.query || '').replace(/\s+/g, ' ').trim();
          const paramsRaw = String(event.params || '');
          const params = paramsRaw.length > maxParamsLength
            ? `${paramsRaw.slice(0, maxParamsLength)}...<truncated>`
            : paramsRaw;

          if (isJsonLogFormat) {
            console.log(
              JSON.stringify({
                tag: 'DB',
                query: compactQuery,
                params,
                durationMs: event.duration,
                provider: dbProvider,
              }),
            );
          } else {
            console.log(
              `[DB] query=${compactQuery} params=${params} duration=${event.duration}ms`,
            );
          }
        });
      }

      await this.$connect();
      console.log('✅ Database connected');
      if (shouldLogQueries) {
        console.log('🧾 DB query logging enabled');
      }
    } else {
      console.log(`✅ Using ${dbProvider} provider (no database connection)`);
    }
  }

  async onModuleDestroy() {
    const dbProvider = resolveDbProviderFromConfig(this.configService);
    if (isDatabaseBackedProvider(dbProvider)) {
      await this.$disconnect();
    }
  }
}
