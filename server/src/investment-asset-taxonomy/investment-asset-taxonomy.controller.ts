import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvestmentAssetTaxonomyService } from './investment-asset-taxonomy.service';
import { CreateInvestmentAssetTaxonomyDto } from './dto/create-investment-asset-taxonomy.dto';
import { UpdateInvestmentAssetTaxonomyDto } from './dto/update-investment-asset-taxonomy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { mockUser } from '../mockdata/users';

@ApiTags('investment-asset-taxonomy')
@Controller('api/investment-asset-taxonomy')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvestmentAssetTaxonomyController {
  constructor(private readonly investmentAssetTaxonomyService: InvestmentAssetTaxonomyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a taxonomy node' })
  create(@Body() createDto: CreateInvestmentAssetTaxonomyDto, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.investmentAssetTaxonomyService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all taxonomy nodes' })
  findAll(@Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.investmentAssetTaxonomyService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a taxonomy node by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.investmentAssetTaxonomyService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a taxonomy node' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateInvestmentAssetTaxonomyDto, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.investmentAssetTaxonomyService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a taxonomy node' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.investmentAssetTaxonomyService.remove(id, userId);
  }
}