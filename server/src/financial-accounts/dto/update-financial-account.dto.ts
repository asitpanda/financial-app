import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateFinancialAccountDto } from './create-financial-account.dto';

// openingBalance is create-only; excluded here so PATCH can never change it
export class UpdateFinancialAccountDto extends PartialType(
  OmitType(CreateFinancialAccountDto, ['openingBalance'] as const),
) {}