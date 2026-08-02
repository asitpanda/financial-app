import { Injectable } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalRepository } from './repositories/goal.repository';

@Injectable()
export class GoalsService {
  constructor(private goalRepository: GoalRepository) {}

  async create(createGoalDto: CreateGoalDto, userId: number) {
    return this.goalRepository.create(createGoalDto, userId);
  }

  async findAll(userId: number) {
    return this.goalRepository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.goalRepository.findOne(id, userId);
  }

  async update(id: number, updateGoalDto: UpdateGoalDto, userId: number) {
    return this.goalRepository.update(id, updateGoalDto, userId);
  }

  async remove(id: number, userId: number) {
    return this.goalRepository.delete(id, userId);
  }
}
