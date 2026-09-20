import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvestmentEventsService } from './investment-events.service';
import { CreateInvestmentEventDto } from './dto/create-investment-event.dto';
import { UpdateInvestmentEventDto } from './dto/update-investment-event.dto';
import { CurrentUserId } from '../auth/current-user-id.decorator';

@ApiTags('investment-events')
@Controller('api')
@ApiBearerAuth()
export class InvestmentEventsController {
  constructor(private readonly service: InvestmentEventsService) {}

  @Get('investments/:investmentId/events')
  async findAllByInvestment(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.findAllByInvestment(String(investmentId), userId);
  }

  @Post('investments/:investmentId/events')
  async create(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @Body() createInvestmentEventDto: CreateInvestmentEventDto,
    @CurrentUserId() userId: number,
  ) {
    return this.service.create({
      ...createInvestmentEventDto,
      investmentId: String(investmentId),
    }, userId);
  }

  @Get('investments/:investmentId/events/:eventId')
  async findOne(
    @Param('investmentId', ParseIntPipe) _investmentId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.findOne(String(eventId), userId);
  }

  @Patch('investments/:investmentId/events/:eventId')
  async update(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() updateInvestmentEventDto: UpdateInvestmentEventDto,
    @CurrentUserId() userId: number,
  ) {
    return this.service.update(String(eventId), {
      ...updateInvestmentEventDto,
      investmentId: String(investmentId),
    }, userId);
  }

  @Delete('investments/:investmentId/events/:eventId')
  async remove(
    @Param('investmentId', ParseIntPipe) _investmentId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.remove(String(eventId), userId);
  }
}
