import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { CurrentUserId } from '../auth/current-user-id.decorator';

@ApiTags('investments')
@Controller('api/investments')
@ApiBearerAuth()
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new investment' })
  create(@Body() createInvestmentDto: CreateInvestmentDto, @CurrentUserId() userId: number) {
    return this.investmentsService.create(createInvestmentDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all investments' })
  findAll(@CurrentUserId() userId: number) {
    return this.investmentsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an investment by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.investmentsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an investment' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateInvestmentDto: UpdateInvestmentDto, @CurrentUserId() userId: number) {
    return this.investmentsService.update(id, updateInvestmentDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an investment' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.investmentsService.remove(id, userId);
  }
}