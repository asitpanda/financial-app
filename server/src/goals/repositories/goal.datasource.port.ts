import type { GoalRecord } from '../goal.types';
import type { CreateGoalDto } from '../dto/create-goal.dto';
import type { UpdateGoalDto } from '../dto/update-goal.dto';

export interface IGoalDataSourcePort {
  create(data: CreateGoalDto, userId: number): Promise<GoalRecord>;
  findAll(userId: number): Promise<GoalRecord[]>;
  findOne(id: number, userId: number): Promise<GoalRecord | null>;
  update(id: number, data: UpdateGoalDto, userId: number): Promise<GoalRecord | null>;
  delete(id: number, userId: number): Promise<void>;
}
