import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRepository } from './repositories/category.repository';

@Injectable()
export class CategoriesService {
  constructor(private categoryRepository: CategoryRepository) {}

  async create(createCategoryDto: CreateCategoryDto, userId: number) {
    return this.categoryRepository.create(createCategoryDto, userId);
  }

  async findAll(userId: number) {
    return this.categoryRepository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.categoryRepository.findOne(id, userId);
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto, userId: number) {
    return this.categoryRepository.update(id, updateCategoryDto, userId);
  }

  async remove(id: number, userId: number) {
    return this.categoryRepository.delete(id, userId);
  }
}
