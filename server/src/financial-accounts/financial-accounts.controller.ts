import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { CreateFinancialAccountDto } from './dto/create-financial-account.dto';
import { UpdateFinancialAccountDto } from './dto/update-financial-account.dto';
import { FinancialAccountsService } from './financial-accounts.service';

@ApiTags('financial-accounts')
@Controller('api/financial-accounts')
@ApiBearerAuth()
export class FinancialAccountsController {
  constructor(private readonly financialAccountsService: FinancialAccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new financial account' })
  create(@Body() createDto: CreateFinancialAccountDto, @CurrentUserId() userId: number) {
    return this.financialAccountsService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all financial accounts' })
  findAll(@CurrentUserId() userId: number) {
    return this.financialAccountsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get financial account by id' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.financialAccountsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update financial account' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateFinancialAccountDto,
    @CurrentUserId() userId: number,
  ) {
    return this.financialAccountsService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete financial account' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.financialAccountsService.remove(id, userId);
  }
}
