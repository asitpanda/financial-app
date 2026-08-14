import { Injectable } from '@nestjs/common';
import type { InvestmentAssetTaxonomyRecord } from '../investment-asset-taxonomy.types';
import { PrismaService } from '../../database/prisma.service';
import type {
  InvestmentAssetTaxonomyUpdateInput,
  InvestmentAssetTaxonomyWriteInput,
} from '../investment-asset-taxonomy.types';
import { IAssetTaxonomyDataSourcePort } from './asset-taxonomy.datasource.port';

const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class AssetTaxonomyPrismaRepository
  implements IAssetTaxonomyDataSourcePort
{
  constructor(private prisma: PrismaService) {}

  private async resolveDefaultAssetMetaIds(
    defaultAssetType?: string | null,
    defaultAssetCategory?: string | null,
  ) {
    if (!defaultAssetType && !defaultAssetCategory) {
      return {
        defaultAssetTypeMetaId: null,
        defaultAssetCategoryMetaId: null,
      };
    }

    const [typeMeta, categoryMeta] = await Promise.all([
      defaultAssetType
        ? this.prisma.appMetaConfigRef.findFirst({
            where: {
              module: 'INVESTMENT',
              configType: 'ASSET_TYPE',
              code: defaultAssetType,
              isActive: true,
            },
          })
        : Promise.resolve(null),
      defaultAssetCategory
        ? this.prisma.appMetaConfigRef.findFirst({
            where: {
              module: 'INVESTMENT',
              configType: 'ASSET_CATEGORY',
              code: defaultAssetCategory,
              isActive: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (defaultAssetType && !typeMeta) {
      throw new Error('Default investment asset type metadata not found');
    }

    if (defaultAssetCategory && !categoryMeta) {
      throw new Error('Default investment asset category metadata not found');
    }

    if (typeMeta && categoryMeta && categoryMeta.parentId !== typeMeta.id) {
      throw new Error('Default investment asset category does not belong to the selected asset type');
    }

    return {
      defaultAssetTypeMetaId: typeMeta?.id ?? null,
      defaultAssetCategoryMetaId: categoryMeta?.id ?? null,
    };
  }

  private mapOutput(record: any): InvestmentAssetTaxonomyRecord {
    return {
      id: record.id,
      userId: record.userId,
      label: record.label,
      nodeType: record.nodeType,
      parentId: record.parentId,
      level: record.level,
      defaultAssetTypeMetaId: record.defaultAssetTypeMetaId ?? null,
      defaultAssetCategoryMetaId: record.defaultAssetCategoryMetaId ?? null,
      defaultAssetType: record.defaultAssetTypeRef?.code ?? null,
      defaultAssetCategory: record.defaultAssetCategoryRef?.code ?? null,
      sortOrder: record.sortOrder,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async create(data: InvestmentAssetTaxonomyWriteInput): Promise<InvestmentAssetTaxonomyRecord> {
    const userId = Number(data.userId);
    const parentId = normalizeNullableNumber(data.parentId);
    const { defaultAssetTypeMetaId, defaultAssetCategoryMetaId } =
      await this.resolveDefaultAssetMetaIds(
        data.defaultAssetType ?? null,
        data.defaultAssetCategory ?? null,
      );

    if (parentId) {
      const parent = await this.prisma.investmentAssetTaxonomy.findFirst({
        where: { id: parentId, userId },
      });
      if (!parent) {
        throw new Error('Parent taxonomy node not found for user');
      }
    }

    const created = await this.prisma.investmentAssetTaxonomy.create({
      data: {
        userId,
        label: data.label,
        nodeType: data.nodeType,
        parentId,
        level: Number(data.level),
        defaultAssetTypeMetaId,
        defaultAssetCategoryMetaId,
        sortOrder: Number(data.sortOrder ?? 0),
        isActive: data.isActive ?? true,
      },
      include: {
        defaultAssetTypeRef: true,
        defaultAssetCategoryRef: true,
      },
    });

    return this.mapOutput(created);
  }

  async findAll(userId: number): Promise<InvestmentAssetTaxonomyRecord[]> {
    const records = await this.prisma.investmentAssetTaxonomy.findMany({
      where: { userId: Number(userId) },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
      include: {
        defaultAssetTypeRef: true,
        defaultAssetCategoryRef: true,
      },
    });

    return records.map((record) => this.mapOutput(record));
  }

  async findOne(id: number, userId: number): Promise<InvestmentAssetTaxonomyRecord | null> {
    const record = await this.prisma.investmentAssetTaxonomy.findFirst({
      where: { id, userId: Number(userId) },
      include: {
        defaultAssetTypeRef: true,
        defaultAssetCategoryRef: true,
      },
    });

    return record ? this.mapOutput(record) : null;
  }

  async update(id: number, userId: number, data: InvestmentAssetTaxonomyUpdateInput): Promise<InvestmentAssetTaxonomyRecord | null> {
    const ownerScoped = await this.prisma.investmentAssetTaxonomy.findFirst({
      where: { id, userId: Number(userId) },
      select: { id: true },
    });
    if (!ownerScoped) {
      throw new Error('Taxonomy node not found for user');
    }

    if (data.parentId !== undefined) {
      const parentId = normalizeNullableNumber(data.parentId);
      if (parentId) {
        const parent = await this.prisma.investmentAssetTaxonomy.findFirst({
          where: { id: parentId, userId: Number(userId) },
        });
        if (!parent) {
          throw new Error('Parent taxonomy node not found for user');
        }
      }
    }

    const existing = await this.findOne(id, userId);
    if (!existing) {
      throw new Error('Taxonomy node not found for user');
    }

    const { defaultAssetTypeMetaId, defaultAssetCategoryMetaId } =
      await this.resolveDefaultAssetMetaIds(
        data.defaultAssetType !== undefined ? data.defaultAssetType : existing.defaultAssetType,
        data.defaultAssetCategory !== undefined ? data.defaultAssetCategory : existing.defaultAssetCategory,
      );

    const updated = await this.prisma.investmentAssetTaxonomy.update({
      where: { id },
      data: {
        label: data.label,
        nodeType: data.nodeType,
        parentId: data.parentId !== undefined ? normalizeNullableNumber(data.parentId) : undefined,
        level: data.level !== undefined ? Number(data.level) : undefined,
        defaultAssetTypeMetaId,
        defaultAssetCategoryMetaId,
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
        isActive: data.isActive,
      },
      include: {
        defaultAssetTypeRef: true,
        defaultAssetCategoryRef: true,
      },
    });

    return this.mapOutput(updated);
  }

  async delete(id: number, userId: number): Promise<void> {
    const ownerScoped = await this.prisma.investmentAssetTaxonomy.findFirst({
      where: { id, userId: Number(userId) },
      select: { id: true },
    });
    if (!ownerScoped) {
      throw new Error('Taxonomy node not found for user');
    }

    await this.prisma.investmentAssetTaxonomy.delete({
      where: { id },
    });
  }
}