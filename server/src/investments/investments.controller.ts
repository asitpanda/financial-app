import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { mockUser } from '../mockdata/users';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('investments')
@Controller('api/investments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new investment' })
  create(@Body() createInvestmentDto: CreateInvestmentDto, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.investmentsService.create(createInvestmentDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all investments' })
  findAll(@Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.investmentsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an investment by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.investmentsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an investment' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateInvestmentDto: UpdateInvestmentDto, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.investmentsService.update(id, updateInvestmentDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an investment' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.investmentsService.remove(id, userId);
  }
}