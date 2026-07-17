import { Controller, Post, Get, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ValuationSnapshotsService } from './valuation-snapshots.service';
import { CreateValuationSnapshotDto } from './dto/create-valuation-snapshot.dto';
import { UpdateValuationSnapshotDto } from './dto/update-valuation-snapshot.dto';

@Controller('api/valuations')
export class ValuationSnapshotsController {
  constructor(private readonly service: ValuationSnapshotsService) {}

  @Post('snapshots')
  async create(@Body() createValuationSnapshotDto: CreateValuationSnapshotDto, @Req() req) {
    // Use current user ID if not provided
    const dto = {
      ...createValuationSnapshotDto,
      userId: createValuationSnapshotDto.userId || '1', // Default to user 1 for mock
    };
    return this.service.create(dto);
  }

  @Get('snapshots/investment/:investmentId')
  async findAllByInvestment(@Param('investmentId') investmentId: string) {
    return this.service.findAllByInvestment(investmentId);
  }

  @Get('snapshots/:id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put('snapshots/:id')
  async update(
    @Param('id') id: string,
    @Body() updateValuationSnapshotDto: UpdateValuationSnapshotDto,
  ) {
    return this.service.update(id, updateValuationSnapshotDto);
  }

  @Delete('snapshots/:id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
