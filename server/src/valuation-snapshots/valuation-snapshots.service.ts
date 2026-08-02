import { Injectable } from '@nestjs/common';
import { CreateValuationSnapshotDto } from './dto/create-valuation-snapshot.dto';
import { UpdateValuationSnapshotDto } from './dto/update-valuation-snapshot.dto';
import { ValuationSnapshotRepository } from './repositories/valuation-snapshot.repository';

@Injectable()
export class ValuationSnapshotsService {
  constructor(private readonly repository: ValuationSnapshotRepository) {}

  async create(createValuationSnapshotDto: CreateValuationSnapshotDto) {
    return this.repository.create(createValuationSnapshotDto);
  }

  async findAllByInvestment(investmentId: string) {
    return this.repository.findAllByInvestment(investmentId);
  }

  async findOne(id: string) {
    return this.repository.findOne(id);
  }

  async update(id: string, updateValuationSnapshotDto: UpdateValuationSnapshotDto) {
    return this.repository.update(id, updateValuationSnapshotDto);
  }

  async remove(id: string) {
    return this.repository.delete(id);
  }
}
