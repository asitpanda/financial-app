import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { mockUser } from '../mockdata/users';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('goals')
@Controller('api/goals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new goal' })
  create(@Body() createGoalDto: CreateGoalDto, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.goalsService.create(createGoalDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all goals' })
  findAll(@Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.goalsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a goal by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.goalsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a goal' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGoalDto: UpdateGoalDto,
    @Request() req,
  ) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.goalsService.update(id, updateGoalDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a goal' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.goalsService.remove(id, userId);
  }
}
