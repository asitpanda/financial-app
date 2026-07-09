import { Injectable } from '@nestjs/common';
import { IGoalRepository } from './goal.repository.interface';
import { mockGoalsStore } from '../../mockdata/goals';
const DEFAULT_GOAL_ICON = 'gift';
const nextGoalId = () => (mockGoalsStore.length ? Math.max(...mockGoalsStore.map((goal) => goal.id)) + 1 : 1);

@Injectable()
export class MockGoalRepository implements IGoalRepository {
  async create(data: any, userId: number): Promise<any> {
    const newGoal = {
      id: nextGoalId(),
      ...data,
      icon: data.icon || DEFAULT_GOAL_ICON,
      currentAmount: data.currentAmount || 0,
      startDate: new Date(),
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockGoalsStore.push(newGoal);
    return newGoal;
  }

  async findAll(userId: number): Promise<any[]> {
    return mockGoalsStore.filter(goal => goal.userId === userId);
  }

  async findOne(id: number, userId: number): Promise<any> {
    return mockGoalsStore.find(goal => goal.id === id && goal.userId === userId);
  }

  async update(id: number, data: any, userId: number): Promise<any> {
    const index = mockGoalsStore.findIndex(goal => goal.id === id && goal.userId === userId);
    if (index === -1) return null;
    
    mockGoalsStore[index] = {
      ...mockGoalsStore[index],
      ...data,
      icon: data.icon || mockGoalsStore[index].icon || DEFAULT_GOAL_ICON,
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
