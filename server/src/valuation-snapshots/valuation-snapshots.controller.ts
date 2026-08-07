import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ValuationSnapshotsService } from './valuation-snapshots.service';
import { CreateValuationSnapshotDto } from './dto/create-valuation-snapshot.dto';
import { UpdateValuationSnapshotDto } from './dto/update-valuation-snapshot.dto';

@Controller('api/valuations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ValuationSnapshotsController {
  constructor(private readonly service: ValuationSnapshotsService) {}

  @Post('snapshots')
  async create(@Body() createValuationSnapshotDto: CreateValuationSnapshotDto) {
    return this.service.create(createValuationSnapshotDto);
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
