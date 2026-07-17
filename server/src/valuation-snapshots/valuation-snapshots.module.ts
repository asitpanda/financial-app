import { Module } from '@nestjs/common';
import { MockValuationSnapshotRepository } from './repositories/mock-valuation-snapshot.repository';
import { ValuationSnapshotsService } from './valuation-snapshots.service';
import { ValuationSnapshotsController } from './valuation-snapshots.controller';

@Module({
  providers: [MockValuationSnapshotRepository, ValuationSnapshotsService],
  controllers: [ValuationSnapshotsController],
  exports: [MockValuationSnapshotRepository, ValuationSnapshotsService],
})
export class ValuationSnapshotsModule {}
