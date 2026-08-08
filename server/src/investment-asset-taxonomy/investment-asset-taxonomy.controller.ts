import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvestmentAssetTaxonomyService } from './investment-asset-taxonomy.service';
import { CreateInvestmentAssetTaxonomyDto } from './dto/create-investment-asset-taxonomy.dto';
import { UpdateInvestmentAssetTaxonomyDto } from './dto/update-investment-asset-taxonomy.dto';
import { CurrentUserId } from '../auth/current-user-id.decorator';

@ApiTags('investment-asset-taxonomy')
@Controller('api/investment-asset-taxonomy')
@ApiBearerAuth()
export class InvestmentAssetTaxonomyController {
  constructor(private readonly investmentAssetTaxonomyService: InvestmentAssetTaxonomyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a taxonomy node' })
  create(@Body() createDto: CreateInvestmentAssetTaxonomyDto, @CurrentUserId() userId: number) {
    return this.investmentAssetTaxonomyService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all taxonomy nodes' })
  findAll(@CurrentUserId() userId: number) {
    return this.investmentAssetTaxonomyService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a taxonomy node by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.investmentAssetTaxonomyService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a taxonomy node' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateInvestmentAssetTaxonomyDto, @CurrentUserId() userId: number) {
    return this.investmentAssetTaxonomyService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a taxonomy node' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.investmentAssetTaxonomyService.remove(id, userId);
  }
}