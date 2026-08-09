import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { GoalRecord } from '../goal.types';
import { PrismaService } from '../../database/prisma.service';
import { IGoalDataSourcePort } from './goal.datasource.port';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { UpdateGoalDto } from '../dto/update-goal.dto';
import { parseOptionalDateInput } from '../../common/utils/date-input';

type GoalWriteInput = Partial<CreateGoalDto> & { deadline?: string | Date | null };
type GoalSanitizedWriteData = {
  name?: string;
  categoryId?: number;
  categoryLabelSnapshot?: string;
  description?: string;
  icon?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: Date | null;
};

@Injectable()
export class GoalPrismaRepository implements IGoalDataSourcePort {
  constructor(private prisma: PrismaService) {}

  private sanitizeGoalData(data: GoalWriteInput): GoalSanitizedWriteData {
    return {
      name: data?.name,
      categoryId: data?.categoryId,
      categoryLabelSnapshot: data?.categoryLabelSnapshot,
      description: data?.description,
      icon: data?.icon,
      targetAmount: data?.targetAmount,
      currentAmount: data?.currentAmount,
      deadline: parseOptionalDateInput(data?.deadline, 'deadline'),
    };
  }

  async create(data: CreateGoalDto, userId: number): Promise<GoalRecord> {
    const sanitized = this.sanitizeGoalData(data);
    const createData: Prisma.GoalUncheckedCreateInput = {
      name: data.name,
      categoryId: data.categoryId,
      categoryLabelSnapshot: data.categoryLabelSnapshot,
      description: sanitized.description ?? null,
      icon: sanitized.icon ?? null,
      targetAmount: data.targetAmount,
      currentAmount: sanitized.currentAmount || 0,
      deadline: sanitized.deadline,
      startDate: new Date(),
      userId,
    };

    return this.prisma.goal.create({
      data: createData,
    });
  }

  async findAll(userId: number): Promise<GoalRecord[]> {
    return this.prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number): Promise<GoalRecord | null> {
    return this.prisma.goal.findFirst({
      where: { id, userId },
    });
  }

  async update(id: number, data: UpdateGoalDto, userId: number): Promise<GoalRecord | null> {
    const existing = await this.prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existing) return null;

    const sanitized = this.sanitizeGoalData(data);
    const updateData: Prisma.GoalUncheckedUpdateInput = sanitized;

    return this.prisma.goal.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number, userId: number): Promise<void> {
    const existing = await this.prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existing) return;

    await this.prisma.goal.delete({
      where: { id },
    });
  }
}
