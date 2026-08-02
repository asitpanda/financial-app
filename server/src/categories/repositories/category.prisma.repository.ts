import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ICategoryDataSourcePort } from './category.datasource.port';

@Injectable()
export class CategoryPrismaRepository implements ICategoryDataSourcePort {
  constructor(private prisma: PrismaService) {}

  async create(data: any, userId: number): Promise<any> {
    return this.prisma.category.create({
      data: {
        ...data,
        userId: userId as any,
      },
    });
  }

  async findAll(userId: number): Promise<any[]> {
    return this.prisma.category.findMany({
      where: { userId: userId as any },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, userId: number): Promise<any> {
    return this.prisma.category.findFirst({
      where: { id: id as any, userId: userId as any },
    });
  }

  async update(id: number, data: any, userId: number): Promise<any> {
    void userId;
    return this.prisma.category.update({
      where: { id: id as any },
      data,
    });
  }

  async delete(id: number, userId: number): Promise<void> {
    void userId;
    await this.prisma.category.delete({
      where: { id: id as any },
    });
  }
}
