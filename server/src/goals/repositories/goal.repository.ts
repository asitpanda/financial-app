import { Inject, Injectable } from '@nestjs/common';
import type { GoalRecord } from '../goal.types';
import type { CreateGoalDto } from '../dto/create-goal.dto';
import type { UpdateGoalDto } from '../dto/update-goal.dto';
import { IGoalDataSourcePort } from './goal.datasource.port';

@Injectable()
export class GoalRepository {
  constructor(
    @Inject('GOAL_DATA_SOURCE')
    private readonly dataSource: IGoalDataSourcePort,
  ) {}

  async create(data: CreateGoalDto, userId: number): Promise<GoalRecord> {
    return this.dataSource.create(data, userId);
  }

  async findAll(userId: number): Promise<GoalRecord[]> {
    return this.dataSource.findAll(userId);
  }

  async findOne(id: number, userId: number): Promise<GoalRecord | null> {
    return this.dataSource.findOne(id, userId);
  }

  async update(id: number, data: UpdateGoalDto, userId: number): Promise<GoalRecord | null> {
    return this.dataSource.update(id, data, userId);
  }

  async delete(id: number, userId: number): Promise<void> {
    return this.dataSource.delete(id, userId);
  }
}
