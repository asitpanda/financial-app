import { Injectable } from '@nestjs/common';
import type { CategoryRecord } from '../category.types';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { ICategoryDataSourcePort } from './category.datasource.port';

@Injectable()
export class CategoryPrismaRepository implements ICategoryDataSourcePort {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCategoryDto, userId: number): Promise<CategoryRecord> {
    return this.prisma.category.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async findAll(userId: number): Promise<CategoryRecord[]> {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, userId: number): Promise<CategoryRecord | null> {
    return this.prisma.category.findFirst({
      where: { id, userId },
    });
  }

  async update(id: number, data: UpdateCategoryDto, userId: number): Promise<CategoryRecord | null> {
    const existing = await this.prisma.category.findFirst({
      where: { id, userId },
    });

    if (!existing) return null;

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async delete(id: number, userId: number): Promise<void> {
    const existing = await this.prisma.category.findFirst({
      where: { id, userId },
    });

    if (!existing) return;

    await this.prisma.category.delete({
      where: { id },
    });
  }
}
