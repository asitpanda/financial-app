import { Injectable } from '@nestjs/common';
import { IGoalDataSourcePort } from './goal.datasource.port';
import { mockGoalsStore } from '../../mockdata/goals';
import type { GoalRecord } from '../goal.types';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { UpdateGoalDto } from '../dto/update-goal.dto';
const DEFAULT_GOAL_ICON = 'gift';
const nextGoalId = () => (mockGoalsStore.length ? Math.max(...mockGoalsStore.map((goal) => goal.id)) + 1 : 1);

@Injectable()
export class GoalMockRepository implements IGoalDataSourcePort {
  async create(data: CreateGoalDto, userId: number): Promise<GoalRecord> {
    const newGoal: GoalRecord = {
      id: nextGoalId(),
      ...data,
      icon: data.icon || DEFAULT_GOAL_ICON,
      description: data.description ?? null,
      currentAmount: data.currentAmount || 0,
      startDate: new Date(),
      deadline: data.deadline ? new Date(data.deadline) : null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockGoalsStore.push(newGoal);
    return newGoal;
  }

  async findAll(userId: number): Promise<GoalRecord[]> {
    return mockGoalsStore.filter(goal => goal.userId === userId);
  }

  async findOne(id: number, userId: number): Promise<GoalRecord | null> {
    return mockGoalsStore.find(goal => goal.id === id && goal.userId === userId);
  }

  async update(id: number, data: UpdateGoalDto, userId: number): Promise<GoalRecord | null> {
    const index = mockGoalsStore.findIndex(goal => goal.id === id && goal.userId === userId);
    if (index === -1) return null;
    
    mockGoalsStore[index] = {
      ...mockGoalsStore[index],
      ...data,
      description: data.description !== undefined ? data.description : mockGoalsStore[index].description,
      icon: data.icon || mockGoalsStore[index].icon || DEFAULT_GOAL_ICON,
      deadline:
        data.deadline !== undefined
          ? data.deadline
            ? new Date(data.deadline)
            : null
          : mockGoalsStore[index].deadline,
      updatedAt: new Date(),
    };
    return mockGoalsStore[index];
  }

  async delete(id: number, userId: number): Promise<void> {
    const index = mockGoalsStore.findIndex(goal => goal.id === id && goal.userId === userId);
    if (index !== -1) {
      mockGoalsStore.splice(index, 1);
    }
  }
}
