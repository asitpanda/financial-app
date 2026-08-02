import { Injectable } from '@nestjs/common';
import { CreateInvestmentAssetTaxonomyDto } from './dto/create-investment-asset-taxonomy.dto';
import { UpdateInvestmentAssetTaxonomyDto } from './dto/update-investment-asset-taxonomy.dto';
import { AssetTaxonomyRepository } from './repositories/asset-taxonomy.repository';

@Injectable()
export class InvestmentAssetTaxonomyService {
  constructor(private readonly repository: AssetTaxonomyRepository) {}

  async create(createDto: CreateInvestmentAssetTaxonomyDto, userId: number) {
    return this.repository.create({ ...createDto, userId });
  }

  async findAll(userId: number) {
    return this.repository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.repository.findOne(id, userId);
  }

  async update(id: number, updateDto: UpdateInvestmentAssetTaxonomyDto, userId: number) {
    return this.repository.update(id, userId, updateDto);
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(id, userId);
  }
}