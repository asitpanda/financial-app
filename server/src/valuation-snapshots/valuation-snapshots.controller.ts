import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ValuationSnapshotsService } from './valuation-snapshots.service';
import { CreateValuationSnapshotDto } from './dto/create-valuation-snapshot.dto';
import { UpdateValuationSnapshotDto } from './dto/update-valuation-snapshot.dto';
import { CurrentUserId } from '../auth/current-user-id.decorator';

@Controller('api/valuations')
@ApiBearerAuth()
export class ValuationSnapshotsController {
  constructor(private readonly service: ValuationSnapshotsService) {}

  @Get('snapshots')
  async findAll(@CurrentUserId() userId: number) {
    return this.service.findAll(userId);
  }

  @Post('snapshots')
  async create(@Body() createValuationSnapshotDto: CreateValuationSnapshotDto, @CurrentUserId() userId: number) {
    return this.service.create(createValuationSnapshotDto, userId);
  }

  @Get('snapshots/investment/:investmentId')
  async findAllByInvestment(@Param('investmentId') investmentId: string, @CurrentUserId() userId: number) {
    return this.service.findAllByInvestment(investmentId, userId);
  }

  @Get('snapshots/:id')
  async findOne(@Param('id') id: string, @CurrentUserId() userId: number) {
    return this.service.findOne(id, userId);
  }

  @Put('snapshots/:id')
  async update(
    @Param('id') id: string,
    @Body() updateValuationSnapshotDto: UpdateValuationSnapshotDto,
    @CurrentUserId() userId: number,
  ) {
    return this.service.update(id, updateValuationSnapshotDto, userId);
  }

  @Delete('snapshots/:id')
  async remove(@Param('id') id: string, @CurrentUserId() userId: number) {
    return this.service.remove(id, userId);
  }
}
