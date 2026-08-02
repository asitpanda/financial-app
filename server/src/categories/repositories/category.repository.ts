import { Inject, Injectable } from '@nestjs/common';
import { ICategoryDataSourcePort } from './category.datasource.port';

@Injectable()
export class CategoryRepository {
  constructor(
    @Inject('CATEGORY_DATA_SOURCE')
    private readonly dataSource: ICategoryDataSourcePort,
  ) {}

  async create(data: any, userId: number): Promise<any> {
    return this.dataSource.create(data, userId);
  }

  async findAll(userId: number): Promise<any[]> {
    return this.dataSource.findAll(userId);
  }

  async findOne(id: number, userId: number): Promise<any> {
    return this.dataSource.findOne(id, userId);
  }

  async update(id: number, data: any, userId: number): Promise<any> {
    return this.dataSource.update(id, data, userId);
  }

  async delete(id: number, userId: number): Promise<void> {
    return this.dataSource.delete(id, userId);
  }
}
