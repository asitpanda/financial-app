import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvestmentAssetTaxonomyService } from './investment-asset-taxonomy.service';
import { CreateInvestmentAssetTaxonomyDto } from './dto/create-investment-asset-taxonomy.dto';
import { UpdateInvestmentAssetTaxonomyDto } from './dto/update-investment-asset-taxonomy.dto';

@ApiTags('investment-asset-taxonomy')
@Controller('api/investment-asset-taxonomy')
export class InvestmentAssetTaxonomyController {
  constructor(private readonly investmentAssetTaxonomyService: InvestmentAssetTaxonomyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a taxonomy node' })
  create(@Body() createDto: CreateInvestmentAssetTaxonomyDto) {
    return this.investmentAssetTaxonomyService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all taxonomy nodes' })
  findAll() {
    return this.investmentAssetTaxonomyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a taxonomy node by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.investmentAssetTaxonomyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a taxonomy node' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateInvestmentAssetTaxonomyDto) {
    return this.investmentAssetTaxonomyService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a taxonomy node' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.investmentAssetTaxonomyService.remove(id);
  }
}