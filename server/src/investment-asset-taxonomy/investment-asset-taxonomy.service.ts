import { Inject, Injectable } from '@nestjs/common';
import { CreateInvestmentAssetTaxonomyDto } from './dto/create-investment-asset-taxonomy.dto';
import { UpdateInvestmentAssetTaxonomyDto } from './dto/update-investment-asset-taxonomy.dto';
import { IInvestmentAssetTaxonomyRepository } from './repositories/investment-asset-taxonomy.repository.interface';

@Injectable()
export class InvestmentAssetTaxonomyService {
  constructor(
    @Inject('INVESTMENT_ASSET_TAXONOMY_REPOSITORY')
    private readonly repository: IInvestmentAssetTaxonomyRepository,
  ) {}

  async create(createDto: CreateInvestmentAssetTaxonomyDto) {
    return this.repository.create(createDto);
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    return this.repository.findOne(id);
  }

  async update(id: number, updateDto: UpdateInvestmentAssetTaxonomyDto) {
    return this.repository.update(id, updateDto);
  }

  async remove(id: number) {
    return this.repository.delete(id);
  }
}