import { PartialType } from '@nestjs/swagger';
import { CreateInvestmentEventDto } from './create-investment-event.dto';

export class UpdateInvestmentEventDto extends PartialType(CreateInvestmentEventDto) {}