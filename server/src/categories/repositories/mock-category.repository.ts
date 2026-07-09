import { Injectable } from '@nestjs/common';
import { ICategoryRepository } from './category.repository.interface';
import { mockCategoriesData } from '../../mockdata';

let mockCategories = [...mockCategoriesData];
const nextCategoryId = () => (mockCategories.length ? Math.max(...mockCategories.map((category) => category.id)) + 1 : 1);

@Injectable()
export class MockCategoryRepository implements ICategoryRepository {
  async create(data: any, userId: number): Promise<any> {
    const newCategory = {
      id: nextCategoryId(),
      ...data,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCategories.push(newCategory);
    return newCategory;
  }

  async findAll(userId: number): Promise<any[]> {
    return mockCategories.filter(cat => cat.userId === userId);
  }

  async findOne(id: number, userId: number): Promise<any> {
    return mockCategories.find(cat => cat.id === id && cat.userId === userId);
  }

  async update(id: number, data: any, userId: number): Promise<any> {
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
