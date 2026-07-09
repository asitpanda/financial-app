import { PartialType } from '@nestjs/swagger';
import { CreateValuationSnapshotDto } from './create-valuation-snapshot.dto';

export class UpdateValuationSnapshotDto extends PartialType(CreateValuationSnapshotDto) {}