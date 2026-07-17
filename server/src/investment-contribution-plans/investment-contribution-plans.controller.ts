import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateInvestmentContributionPlanDto } from './dto/create-investment-contribution-plan.dto';
import { UpdateInvestmentContributionPlanDto } from './dto/update-investment-contribution-plan.dto';
import { InvestmentContributionPlansService } from './investment-contribution-plans.service';

@ApiTags('investment-contribution-plans')
@Controller('api/investments/:investmentId/contribution-plans')
export class InvestmentContributionPlansController {
  constructor(private readonly contributionPlansService: InvestmentContributionPlansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a contribution plan for an investment' })
  create(@Param('investmentId') investmentId: string, @Body() createDto: CreateInvestmentContributionPlanDto) {
    return this.contributionPlansService.create({ ...createDto, investmentId });
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