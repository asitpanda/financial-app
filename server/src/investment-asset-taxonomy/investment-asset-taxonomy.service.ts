import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateInvestmentAssetTaxonomyDto } from './dto/create-investment-asset-taxonomy.dto';
import { UpdateInvestmentAssetTaxonomyDto } from './dto/update-investment-asset-taxonomy.dto';
import { AssetTaxonomyRepository } from './repositories/asset-taxonomy.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InvestmentAssetTaxonomyService {
  constructor(
    private readonly repository: AssetTaxonomyRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async getInvestmentAssetTypeConfigByCode(assetType: string | null | undefined) {
    const normalizedAssetType = String(assetType || '').trim().toUpperCase();
    if (!normalizedAssetType) return null;

    const assetTypeMeta = await this.prisma.appMetaConfigRef.findFirst({
      where: {
        module: 'INVESTMENT',
        configType: 'ASSET_TYPE',
        code: normalizedAssetType,
        isActive: true,
      },
    });

    if (!assetTypeMeta) return null;

    const categories = await this.prisma.appMetaConfigRef.findMany({
      where: {
        module: 'INVESTMENT',
        configType: 'ASSET_CATEGORY',
        parentId: assetTypeMeta.id,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    return {
      code: assetTypeMeta.code,
      label: assetTypeMeta.label,
      categories: categories.map((category) => ({
        code: category.code,
        label: category.label,
      })),
    };
  }

  private async isValidInvestmentClassification(
    assetType: string | null | undefined,
    assetCategory: string | null | undefined,
  ) {
    const typeConfig = await this.getInvestmentAssetTypeConfigByCode(assetType);
    if (!typeConfig) return false;

    const normalizedAssetCategory = String(assetCategory || '').trim().toUpperCase();
    return typeConfig.categories.some((categoryConfig) => categoryConfig.code === normalizedAssetCategory);
  }

  private async assertTaxonomyRules(
    payload: Partial<CreateInvestmentAssetTaxonomyDto>,
    userId: number,
    editingNodeId?: number,
  ) {
    const taxonomyNodes = await this.repository.findAll(userId);
    const normalizedLabel = String(payload.label || '').trim().toLowerCase();
    const resolvedParentId = payload.parentId == null ? null : Number(payload.parentId);
    const resolvedLevel = Number(payload.level);
    const defaultAssetType = String(payload.defaultAssetType || '').trim().toUpperCase();
    const defaultAssetCategory = String(payload.defaultAssetCategory || '').trim().toUpperCase();

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

    if (defaultAssetCategory && !defaultAssetType) {
      throw new BadRequestException({
        message: 'Default asset type is required when a default asset category is set',
        field: 'defaultAssetType',
      });
    }

    if (defaultAssetType && !(await this.getInvestmentAssetTypeConfigByCode(defaultAssetType))) {
      throw new BadRequestException({
        message: 'Unsupported default asset type',
        field: 'defaultAssetType',
      });
    }

    if (
      defaultAssetType &&
      defaultAssetCategory &&
      !(await this.isValidInvestmentClassification(defaultAssetType, defaultAssetCategory))
    ) {
      throw new BadRequestException({
        message: 'Default asset category is not valid for the selected default asset type',
        field: 'defaultAssetCategory',
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

    // Reparenting across branches can change this node's depth; shift the whole
    // subtree by the same delta so descendant levels stay consistent with it.
    const nextLevel = updateDto.level !== undefined ? Number(updateDto.level) : Number(existingNode.level);
    const levelDelta = nextLevel - Number(existingNode.level);
    const descendantLevelUpdates = levelDelta !== 0
      ? await this.collectDescendantLevelShifts(id, levelDelta, userId)
      : [];

    const updated = await this.repository.update(id, userId, updateDto);

    if (descendantLevelUpdates.length) {
      await this.repository.updateLevelsForDescendants(userId, descendantLevelUpdates);
    }

    return updated;
  }

  private async collectDescendantLevelShifts(
    rootId: number,
    delta: number,
    userId: number,
  ): Promise<Array<{ id: number; level: number }>> {
    const allNodes = await this.repository.findAll(userId);
    const childrenByParentId = new Map<number, typeof allNodes>();
    for (const node of allNodes) {
      if (node.parentId == null) continue;
      const key = Number(node.parentId);
      if (!childrenByParentId.has(key)) childrenByParentId.set(key, []);
      childrenByParentId.get(key)!.push(node);
    }

    const updates: Array<{ id: number; level: number }> = [];
    const queue = [...(childrenByParentId.get(Number(rootId)) || [])];

    while (queue.length) {
      const node = queue.shift()!;
      const newLevel = Number(node.level) + delta;

      if (newLevel < 1 || newLevel > 5) {
        throw new BadRequestException({
          message: 'Moving this node would push part of its subtree outside the supported hierarchy depth (levels 1-5)',
          field: 'level',
        });
      }

      updates.push({ id: Number(node.id), level: newLevel });
      queue.push(...(childrenByParentId.get(Number(node.id)) || []));
    }

    return updates;
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(id, userId);
  }
}