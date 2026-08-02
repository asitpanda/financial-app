import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ValuationSnapshotsService } from './valuation-snapshots.service';
import { CreateValuationSnapshotDto } from './dto/create-valuation-snapshot.dto';
import { UpdateValuationSnapshotDto } from './dto/update-valuation-snapshot.dto';

@Controller('api/valuations')
export class ValuationSnapshotsController {
  constructor(private readonly service: ValuationSnapshotsService) {}

  @Post('snapshots')
  async create(@Body() createValuationSnapshotDto: CreateValuationSnapshotDto, @Req() req) {
    const resolvedUserId = createValuationSnapshotDto.userId || req.user?.id;
    if (!resolvedUserId) {
      throw new BadRequestException({
        field: 'userId',
        message: 'userId is required either in auth context or payload.',
      });
    }

    const dto = {
      ...createValuationSnapshotDto,
      userId: String(resolvedUserId),
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
