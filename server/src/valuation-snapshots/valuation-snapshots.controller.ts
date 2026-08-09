import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ValuationSnapshotsService } from './valuation-snapshots.service';
import { CreateValuationSnapshotDto } from './dto/create-valuation-snapshot.dto';
import { UpdateValuationSnapshotDto } from './dto/update-valuation-snapshot.dto';
import { CurrentUserId } from '../auth/current-user-id.decorator';

@Controller('api')
@ApiBearerAuth()
export class ValuationSnapshotsController {
  constructor(private readonly service: ValuationSnapshotsService) {}

  @Get('valuation-snapshots')
  async findAll(@CurrentUserId() userId: number) {
    return this.service.findAll(userId);
  }

  @Post('investments/:investmentId/valuation-snapshots')
  async create(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @Body() createValuationSnapshotDto: CreateValuationSnapshotDto,
    @CurrentUserId() userId: number,
  ) {
    return this.service.create({
      ...createValuationSnapshotDto,
      investmentId: String(investmentId),
    }, userId);
  }

  @Get('investments/:investmentId/valuation-snapshots')
  async findAllByInvestment(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.findAllByInvestment(String(investmentId), userId);
  }

  @Get('investments/:investmentId/valuation-snapshots/:snapshotId')
  async findOne(
    @Param('investmentId', ParseIntPipe) _investmentId: number,
    @Param('snapshotId', ParseIntPipe) snapshotId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.findOne(String(snapshotId), userId);
  }

  @Patch('investments/:investmentId/valuation-snapshots/:snapshotId')
  async update(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @Param('snapshotId', ParseIntPipe) snapshotId: number,
    @Body() updateValuationSnapshotDto: UpdateValuationSnapshotDto,
    @CurrentUserId() userId: number,
  ) {
    return this.service.update(String(snapshotId), {
      ...updateValuationSnapshotDto,
      investmentId: String(investmentId),
    }, userId);
  }

  @Delete('investments/:investmentId/valuation-snapshots/:snapshotId')
  async remove(
    @Param('investmentId', ParseIntPipe) _investmentId: number,
    @Param('snapshotId', ParseIntPipe) snapshotId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.remove(String(snapshotId), userId);
  }
}
