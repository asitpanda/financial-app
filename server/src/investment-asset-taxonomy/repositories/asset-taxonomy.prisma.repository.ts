import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IAssetTaxonomyDataSourcePort } from './asset-taxonomy.datasource.port';

const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class AssetTaxonomyPrismaRepository
  implements IAssetTaxonomyDataSourcePort
{
  constructor(private prisma: PrismaService) {}

  async create(data: any): Promise<any> {
    const userId = Number(data.userId);
    const parentId = normalizeNullableNumber(data.parentId);

    if (parentId) {
      const parent = await this.prisma.investmentAssetTaxonomy.findFirst({
        where: { id: parentId, userId },
      });
      if (!parent) {
        throw new Error('Parent taxonomy node not found for user');
      }
    }

    return this.prisma.investmentAssetTaxonomy.create({
      data: {
        ...data,
        userId,
        parentId,
        level: Number(data.level),
        sortOrder: Number(data.sortOrder ?? 0),
      },
    });
  }

  async findAll(userId: number): Promise<any[]> {
    return this.prisma.investmentAssetTaxonomy.findMany({
      where: { userId: Number(userId) },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async findOne(id: number, userId: number): Promise<any> {
    return this.prisma.investmentAssetTaxonomy.findFirst({
      where: { id, userId: Number(userId) },
    });
  }

  async update(id: number, userId: number, data: any): Promise<any> {
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

    return this.prisma.investmentAssetTaxonomy.update({
      where: { id },
      data: {
        ...data,
        parentId: data.parentId !== undefined ? normalizeNullableNumber(data.parentId) : undefined,
        level: data.level !== undefined ? Number(data.level) : undefined,
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
      },
    });
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