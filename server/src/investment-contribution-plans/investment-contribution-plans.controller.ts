import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateInvestmentContributionPlanDto } from './dto/create-investment-contribution-plan.dto';
import { UpdateInvestmentContributionPlanDto } from './dto/update-investment-contribution-plan.dto';
import { PreviewRecurringContributionPlanDto } from './dto/preview-recurring-contribution-plan.dto';
import { ConfirmRecurringContributionPlanDto } from './dto/confirm-recurring-contribution-plan.dto';
import { SkipCurrentContributionDto } from './dto/skip-current-contribution.dto';
import { InvestmentContributionPlansService } from './investment-contribution-plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { mockUser } from '../mockdata/users';

@ApiTags('investment-contribution-plans')
@Controller('api/investments/:investmentId/contribution-plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvestmentContributionPlansController {
  constructor(private readonly contributionPlansService: InvestmentContributionPlansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a contribution plan for an investment' })
  create(@Param('investmentId') investmentId: string, @Body() createDto: CreateInvestmentContributionPlanDto) {
    return this.contributionPlansService.create({ ...createDto, investmentId });
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview historical recurring contribution occurrences without writing data' })
  preview(
    @Param('investmentId') investmentId: string,
    @Body() previewDto: PreviewRecurringContributionPlanDto,
  ) {
    return this.contributionPlansService.previewRecurringPlan(investmentId, {
      ...previewDto,
      investmentId,
    });
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Create recurring contribution plan and selected historical events' })
  confirm(
    @Param('investmentId') investmentId: string,
    @Body() confirmDto: ConfirmRecurringContributionPlanDto,
    @Request() req,
  ) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.contributionPlansService.confirmRecurringPlan(
      investmentId,
      confirmDto,
      userId,
    );
  }

  @Post(':id/skip-current')
  @ApiOperation({ summary: 'Skip the current due recurring contribution and advance the plan' })
  skipCurrent(
    @Param('investmentId') investmentId: string,
    @Param('id') id: string,
    @Body() skipDto: SkipCurrentContributionDto,
    @Request() req,
  ) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.contributionPlansService.skipCurrentContribution(
      investmentId,
      id,
      userId,
      skipDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get contribution plans for an investment' })
  findAllByInvestment(@Param('investmentId') investmentId: string) {
    return this.contributionPlansService.findAllByInvestment(investmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an investment contribution plan by ID' })
  findOne(@Param('id') id: string) {
    return this.contributionPlansService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an investment contribution plan' })
  update(@Param('id') id: string, @Param('investmentId') investmentId: string, @Body() updateDto: UpdateInvestmentContributionPlanDto) {
    return this.contributionPlansService.update(id, { ...updateDto, investmentId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an investment contribution plan' })
  remove(@Param('id') id: string) {
    return this.contributionPlansService.remove(id);
  }
}