import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { RecordContributionDto } from './dto/record-contribution.dto';
import { RecordWithdrawalDto } from './dto/record-withdrawal.dto';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { parseRequiredDateInput } from '../common/utils/date-input';

@ApiTags('transactions')
@Controller('api/transactions')
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  create(@Body() createTransactionDto: CreateTransactionDto, @CurrentUserId() userId: number) {
    return this.transactionsService.create(createTransactionDto, userId);
  }

  @Post('contributions/record')
  @ApiOperation({ summary: 'Record an investment contribution - creates both Transaction and InvestmentEvent' })
  recordContribution(@Body() recordContributionDto: RecordContributionDto, @CurrentUserId() userId: number) {
    return this.transactionsService.recordContribution(recordContributionDto, userId);
  }

  @Post('withdrawals/record')
  @ApiOperation({ summary: 'Record an investment principal withdrawal' })
  recordWithdrawal(@Body() recordWithdrawalDto: RecordWithdrawalDto, @CurrentUserId() userId: number) {
    return this.transactionsService.recordWithdrawal(recordWithdrawalDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  findAll(
    @CurrentUserId() userId: number,
    @Query('type', new ParseEnumPipe(TransactionType, { optional: true })) type?: TransactionType,
  ) {
    if (type) {
      return this.transactionsService.findByType(userId, type);
    }
    return this.transactionsService.findAll(userId);
  }

  @Get('date-range')
  @ApiOperation({ summary: 'Get transactions by date range' })
  findByDateRange(
    @CurrentUserId() userId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.transactionsService.findByDateRange(
      userId,
      parseRequiredDateInput(startDate, 'startDate'),
      parseRequiredDateInput(endDate, 'endDate'),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.transactionsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @CurrentUserId() userId: number,
  ) {
    return this.transactionsService.update(id, updateTransactionDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.transactionsService.remove(id, userId);
  }
}
