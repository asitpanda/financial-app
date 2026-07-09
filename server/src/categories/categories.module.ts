import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { MockCategoryRepository } from './repositories/mock-category.repository';
import { SupabaseCategoryRepository } from './repositories/supabase-category.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [CategoriesController],
  providers: [
    {
      provide: 'CATEGORY_REPOSITORY',
      useFactory: (configService: ConfigService) => {
        const dbProvider = configService.get('DB_PROVIDER', 'mock');
        console.log(`📂 Categories using ${dbProvider} repository`);
        
        switch (dbProvider) {
          case 'supabase':
            return new SupabaseCategoryRepository(null); // Will be injected
          case 'mock':
          default:
            return new MockCategoryRepository();
        }
      },
      inject: [ConfigService],
    },
    CategoriesService,
  ],
})
export class CategoriesModule {}
