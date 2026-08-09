import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateInvestmentAssetTaxonomyDto } from './dto/create-investment-asset-taxonomy.dto';
import { UpdateInvestmentAssetTaxonomyDto } from './dto/update-investment-asset-taxonomy.dto';
import { AssetTaxonomyRepository } from './repositories/asset-taxonomy.repository';

@Injectable()
export class InvestmentAssetTaxonomyService {
  constructor(private readonly repository: AssetTaxonomyRepository) {}

  private async assertTaxonomyRules(
    payload: Partial<CreateInvestmentAssetTaxonomyDto>,
    userId: number,
    editingNodeId?: number,
  ) {
    const taxonomyNodes = await this.repository.findAll(userId);
    const normalizedLabel = String(payload.label || '').trim().toLowerCase();
    const resolvedParentId = payload.parentId == null ? null : Number(payload.parentId);
    const resolvedLevel = Number(payload.level);

    if (resolvedLevel > 1 && !resolvedParentId) {
      throw new BadRequestException({
        message: 'Parent is required for nested nodes',
        field: 'parentId',
      });
    }

    if (resolvedLevel === 1 && resolvedParentId) {
      throw new BadRequestException({
        message: 'Top-level taxonomy nodes cannot have a parent',
        field: 'parentId',
      });
    }

    if (resolvedParentId) {
      const parentNode = taxonomyNodes.find(
        (node) => Number(node.id) === resolvedParentId,
      );

      if (!parentNode) {
        throw new BadRequestException({
          message: 'Parent taxonomy node not found for user',
          field: 'parentId',
        });
      }

      if (Number(parentNode.level) !== resolvedLevel - 1) {
        throw new BadRequestException({
          message: 'Parent must come from the previous level',
          field: 'parentId',
        });
      }
    }

    const duplicateNode = taxonomyNodes.find(
      (node) =>
        Number(node.id) !== Number(editingNodeId) &&
        Number(node.parentId ?? 0) === Number(resolvedParentId ?? 0) &&
        String(node.label || '').trim().toLowerCase() === normalizedLabel,
    );

    if (duplicateNode) {
      throw new BadRequestException({
        message: 'Label already exists under the selected parent',
        field: 'label',
      });
    }
  }

  async create(createDto: CreateInvestmentAssetTaxonomyDto, userId: number) {
    await this.assertTaxonomyRules(createDto, userId);
    return this.repository.create({ ...createDto, userId });
  }

  async findAll(userId: number) {
    return this.repository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.repository.findOne(id, userId);
  }

  async update(id: number, updateDto: UpdateInvestmentAssetTaxonomyDto, userId: number) {
    const existingNode = await this.repository.findOne(id, userId);
    if (!existingNode) {
      return null;
    }

    await this.assertTaxonomyRules(
      {
        ...existingNode,
        ...updateDto,
      },
      userId,
      id,
    );

    return this.repository.update(id, userId, updateDto);
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(id, userId);
  }
}