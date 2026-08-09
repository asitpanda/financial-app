import { Injectable } from '@nestjs/common';
import { ICategoryDataSourcePort } from './category.datasource.port';
import { mockCategoriesData } from '../../mockdata';
import type { CategoryRecord } from '../category.types';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

let mockCategories = [...mockCategoriesData];
const nextCategoryId = () => (mockCategories.length ? Math.max(...mockCategories.map((category) => category.id)) + 1 : 1);

@Injectable()
export class CategoryMockRepository implements ICategoryDataSourcePort {
  async create(data: CreateCategoryDto, userId: number): Promise<CategoryRecord> {
    const newCategory: CategoryRecord = {
      id: nextCategoryId(),
      ...data,
      icon: data.icon ?? null,
      color: data.color ?? null,
      isSystem: false,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCategories.push(newCategory);
    return newCategory;
  }

  async findAll(userId: number): Promise<CategoryRecord[]> {
    return mockCategories.filter(cat => cat.userId === userId);
  }

  async findOne(id: number, userId: number): Promise<CategoryRecord | null> {
    return mockCategories.find(cat => cat.id === id && cat.userId === userId);
  }

  async update(id: number, data: UpdateCategoryDto, userId: number): Promise<CategoryRecord | null> {
    const index = mockCategories.findIndex(cat => cat.id === id && cat.userId === userId);
    if (index === -1) return null;
    
    mockCategories[index] = {
      ...mockCategories[index],
      ...data,
      updatedAt: new Date(),
    };
    return mockCategories[index];
  }

  async delete(id: number, userId: number): Promise<void> {
    const index = mockCategories.findIndex(cat => cat.id === id && cat.userId === userId);
    if (index !== -1) {
      mockCategories.splice(index, 1);
    }
  }
}
