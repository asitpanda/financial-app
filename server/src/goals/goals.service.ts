import { Injectable, Inject } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { IGoalRepository } from './repositories/goal.repository.interface';

@Injectable()
export class GoalsService {
  constructor(
    @Inject('GOAL_REPOSITORY')
    private goalRepository: IGoalRepository,
  ) {}

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
