import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvestmentEventsService } from './investment-events.service';
import { CreateInvestmentEventDto } from './dto/create-investment-event.dto';
import { UpdateInvestmentEventDto } from './dto/update-investment-event.dto';
import { CurrentUserId } from '../auth/current-user-id.decorator';

@ApiTags('investment-events')
@Controller('api/investment-events')
@ApiBearerAuth()
export class InvestmentEventsController {
  constructor(private readonly service: InvestmentEventsService) {}

  @Get()
  async findAll(@CurrentUserId() userId: number) {
    return this.service.findAll(userId);
  }

  @Post()
  async create(@Body() createInvestmentEventDto: CreateInvestmentEventDto, @CurrentUserId() userId: number) {
    return this.service.create(createInvestmentEventDto, userId);
  }

  @Get('investment/:investmentId')
  async findAllByInvestment(@Param('investmentId') investmentId: string, @CurrentUserId() userId: number) {
    return this.service.findAllByInvestment(investmentId, userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUserId() userId: number) {
    return this.service.findOne(id, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateInvestmentEventDto: UpdateInvestmentEventDto,
    @CurrentUserId() userId: number,
  ) {
    return this.service.update(id, updateInvestmentEventDto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUserId() userId: number) {
    return this.service.remove(id, userId);
  }
}
