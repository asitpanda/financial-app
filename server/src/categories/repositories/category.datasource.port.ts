import type { CategoryRecord } from '../category.types';
import type { CreateCategoryDto } from '../dto/create-category.dto';
import type { UpdateCategoryDto } from '../dto/update-category.dto';

export interface ICategoryDataSourcePort {
  create(data: CreateCategoryDto, userId: number): Promise<CategoryRecord>;
  findAll(userId: number): Promise<CategoryRecord[]>;
  findOne(id: number, userId: number): Promise<CategoryRecord | null>;
  update(id: number, data: UpdateCategoryDto, userId: number): Promise<CategoryRecord | null>;
  delete(id: number, userId: number): Promise<void>;
}
