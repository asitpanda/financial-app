import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { CreateInvestmentBenefitDto } from './dto/create-investment-benefit.dto';
import { QuickRealizeInvestmentBenefitDto, RealizeInvestmentBenefitDto } from './dto/realize-investment-benefit.dto';
import { UpdateInvestmentBenefitDto } from './dto/update-investment-benefit.dto';
import { InvestmentBenefitsService } from './investment-benefits.service';

@ApiTags('investment-benefits')
@Controller('api')
@ApiBearerAuth()
export class InvestmentBenefitsController {
  constructor(private readonly service: InvestmentBenefitsService) {}

  @Get('investment-benefits')
  findAll(@CurrentUserId() userId: number) {
    return this.service.findAll(userId);
  }

  @Get('investments/:investmentId/benefits')
  findAllByInvestment(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.findAllByInvestment(String(investmentId), userId);
  }

  @Post('investments/:investmentId/benefits')
  create(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @Body() dto: CreateInvestmentBenefitDto,
    @CurrentUserId() userId: number,
  ) {
    return this.service.create(String(investmentId), dto, userId);
  }

  @Get('investments/:investmentId/benefits/:benefitId')
  findOne(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @Param('benefitId', ParseIntPipe) benefitId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.findOneWithDetails(String(benefitId), String(investmentId), userId);
  }

  @Patch('investments/:investmentId/benefits/:benefitId')
  update(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @Param('benefitId', ParseIntPipe) benefitId: number,
    @Body() dto: UpdateInvestmentBenefitDto,
    @CurrentUserId() userId: number,
  ) {
    return this.service.update(String(benefitId), String(investmentId), dto, userId);
  }

  @Delete('investments/:investmentId/benefits/:benefitId')
  remove(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @Param('benefitId', ParseIntPipe) benefitId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.remove(String(benefitId), String(investmentId), userId);
  }

  @Post('investments/:investmentId/benefits/:benefitId/realize')
  realize(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @Param('benefitId', ParseIntPipe) benefitId: number,
    @Body() dto: RealizeInvestmentBenefitDto,
    @CurrentUserId() userId: number,
  ) {
    return this.service.realize(String(benefitId), String(investmentId), dto, userId);
  }

  @Post('investments/:investmentId/benefits/quick-realize')
  quickRealize(
    @Param('investmentId', ParseIntPipe) investmentId: number,
    @Body() dto: QuickRealizeInvestmentBenefitDto,
    @CurrentUserId() userId: number,
  ) {
    return this.service.quickRealize(String(investmentId), dto, userId);
  }
}