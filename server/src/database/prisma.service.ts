import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL'),
        },
      },
    });
  }

  async onModuleInit() {
    const dbProvider = this.configService.get('DB_PROVIDER', 'mock');
    
    // Only connect to database if we're using Supabase
    if (dbProvider === 'supabase') {
      await this.$connect();
      console.log('✅ Database connected');
    } else {
      console.log(`✅ Using ${dbProvider} provider (no database connection)`);
    }
  }

  async onModuleDestroy() {
    const dbProvider = this.configService.get('DB_PROVIDER', 'mock');
    if (dbProvider === 'supabase') {
      await this.$disconnect();
    }
  }
}
