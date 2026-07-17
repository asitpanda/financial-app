import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { RecordContributionDto } from './dto/record-contribution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { mockUser } from '../mockdata/users';

@ApiTags('transactions')
@Controller('api/transactions')
// @UseGuards(JwtAuthGuard)  // Uncomment when auth is ready
// @ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  create(@Body() createTransactionDto: CreateTransactionDto, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.transactionsService.create(createTransactionDto, userId);
  }

  @Post('contributions/record')
  @ApiOperation({ summary: 'Record an investment contribution - creates both Transaction and InvestmentEvent' })
  recordContribution(@Body() recordContributionDto: RecordContributionDto, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.transactionsService.recordContribution(recordContributionDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  findAll(@Request() req, @Query('type') type?: string) {
    const userId = Number(req.user?.id ?? mockUser.id);
    if (type) {
      return this.transactionsService.findByType(userId, type);
    }
    return this.transactionsService.findAll(userId);
  }

  @Get('sources')
  @ApiOperation({ summary: 'Get available transaction bank/source options' })
  getSources() {
    return this.transactionsService.getSources();
  }

  @Get('date-range')
  @ApiOperation({ summary: 'Get transactions by date range' })
  findByDateRange(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.transactionsService.findByDateRange(
      userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.transactionsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @Request() req,
  ) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.transactionsService.update(id, updateTransactionDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.transactionsService.remove(id, userId);
  }
}
