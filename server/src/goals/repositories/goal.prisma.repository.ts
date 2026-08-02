import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IGoalDataSourcePort } from './goal.datasource.port';

@Injectable()
export class GoalPrismaRepository implements IGoalDataSourcePort {
  constructor(private prisma: PrismaService) {}

  private sanitizeGoalData(data: any) {
    return {
      name: data?.name,
      categoryId: data?.categoryId,
      categoryLabelSnapshot: data?.categoryLabelSnapshot,
      description: data?.description,
      icon: data?.icon,
      targetAmount: data?.targetAmount,
      currentAmount: data?.currentAmount,
      deadline: data?.deadline,
    };
  }

  async create(data: any, userId: number): Promise<any> {
    const sanitized = this.sanitizeGoalData(data);
    const createData: any = {
      ...sanitized,
      currentAmount: sanitized.currentAmount || 0,
      startDate: new Date(),
      userId: userId as any,
    };

    return this.prisma.goal.create({
      data: createData,
    });
  }

  async findAll(userId: number): Promise<any[]> {
    return this.prisma.goal.findMany({
      where: { userId: userId as any },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number): Promise<any> {
    return this.prisma.goal.findFirst({
      where: { id: id as any, userId: userId as any },
    });
  }

  async update(id: number, data: any, userId: number): Promise<any> {
    void userId;
    const sanitized = this.sanitizeGoalData(data);
    const updateData: any = sanitized;

    return this.prisma.goal.update({
      where: { id: id as any },
      data: updateData,
    });
  }

  async delete(id: number, userId: number): Promise<void> {
    void userId;
    await this.prisma.goal.delete({
      where: { id: id as any },
    });
  }
}
