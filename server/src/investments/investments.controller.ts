import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { InvestmentDashboardAnalyticsResponseDto } from './dto/dashboard-analytics-response.dto';
import { InvestmentDetailResponseDto } from './dto/investment-detail-response.dto';
import { InvestmentPerformanceResponseDto } from './dto/investment-performance-response.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { CurrentUserId } from '../auth/current-user-id.decorator';

@ApiTags('investments')
@Controller('api/investments')
@ApiBearerAuth()
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new investment' })
  create(@Body() createInvestmentDto: CreateInvestmentDto, @CurrentUserId() userId: number) {
    return this.investmentsService.create(createInvestmentDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all investments' })
  findAll(@CurrentUserId() userId: number) {
    return this.investmentsService.findAll(userId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get grouped dashboard analytics for investments' })
  @ApiOkResponse({ type: InvestmentDashboardAnalyticsResponseDto })
  getDashboardAnalytics(@CurrentUserId() userId: number) {
    return this.investmentsService.getDashboardAnalytics(userId);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Get investment performance history' })
  @ApiOkResponse({ type: InvestmentPerformanceResponseDto })
  getPerformance(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.investmentsService.getPerformance(id, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an investment by ID' })
  @ApiOkResponse({ type: InvestmentDetailResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.investmentsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an investment' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateInvestmentDto: UpdateInvestmentDto, @CurrentUserId() userId: number) {
    return this.investmentsService.update(id, updateInvestmentDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an investment' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.investmentsService.remove(id, userId);
  }
}