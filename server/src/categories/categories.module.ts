import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoryMockRepository } from './repositories/category.mock.repository';
import { CategoryPrismaRepository } from './repositories/category.prisma.repository';
import { CategoryRepository } from './repositories/category.repository';
import { DatabaseModule } from '../database/database.module';
import { createProviderBackedBinding } from '../database/db-provider';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [CategoriesController],
  providers: [
    CategoryPrismaRepository,
    CategoryMockRepository,
    createProviderBackedBinding({
      token: 'CATEGORY_DATA_SOURCE',
      databaseToken: CategoryPrismaRepository,
      mockToken: CategoryMockRepository,
      logLabel: '📂 Categories',
    }),
    CategoryRepository,
    CategoriesService,
  ],
})
export class CategoriesModule {}
