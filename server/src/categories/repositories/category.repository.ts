import { Inject, Injectable } from '@nestjs/common';
import type { CategoryRecord } from '../category.types';
import type { CreateCategoryDto } from '../dto/create-category.dto';
import type { UpdateCategoryDto } from '../dto/update-category.dto';
import { ICategoryDataSourcePort } from './category.datasource.port';

@Injectable()
export class CategoryRepository {
  constructor(
    @Inject('CATEGORY_DATA_SOURCE')
    private readonly dataSource: ICategoryDataSourcePort,
  ) {}

  async create(data: CreateCategoryDto, userId: number): Promise<CategoryRecord> {
    return this.dataSource.create(data, userId);
  }

  async findAll(userId: number): Promise<CategoryRecord[]> {
    return this.dataSource.findAll(userId);
  }

  async findOne(id: number, userId: number): Promise<CategoryRecord | null> {
    return this.dataSource.findOne(id, userId);
  }

  async update(id: number, data: UpdateCategoryDto, userId: number): Promise<CategoryRecord | null> {
    return this.dataSource.update(id, data, userId);
  }

  async delete(id: number, userId: number): Promise<void> {
    return this.dataSource.delete(id, userId);
  }
}
