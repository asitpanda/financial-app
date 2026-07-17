import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { InvestmentEventsService } from './investment-events.service';
import { CreateInvestmentEventDto } from './dto/create-investment-event.dto';
import { UpdateInvestmentEventDto } from './dto/update-investment-event.dto';

@Controller('api/investment-events')
export class InvestmentEventsController {
  constructor(private readonly service: InvestmentEventsService) {}

  @Post()
  async create(@Body() createInvestmentEventDto: CreateInvestmentEventDto) {
    return this.service.create(createInvestmentEventDto);
  }

  @Get('investment/:investmentId')
  async findAllByInvestment(@Param('investmentId') investmentId: string) {
    return this.service.findAllByInvestment(investmentId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateInvestmentEventDto: UpdateInvestmentEventDto,
  ) {
    return this.service.update(id, updateInvestmentEventDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
