import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from './listing.types';

export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;
}