import { Injectable } from '@nestjs/common';
import { IAssetTaxonomyDataSourcePort } from './asset-taxonomy.datasource.port';
import { mockInvestmentAssetTaxonomyData } from '../../mockdata';

let mockInvestmentAssetTaxonomy = [...mockInvestmentAssetTaxonomyData];

const nextTaxonomyId = () =>
  (mockInvestmentAssetTaxonomy.length ? Math.max(...mockInvestmentAssetTaxonomy.map((node) => node.id)) + 1 : 1);

const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class AssetTaxonomyMockRepository implements IAssetTaxonomyDataSourcePort {
  async create(data: any): Promise<any> {
    const timestamp = new Date();
    const userId = Number(data.userId);
    const parentId = normalizeNullableNumber(data.parentId);

    if (parentId) {
      const parent = mockInvestmentAssetTaxonomy.find(
        (node) => node.id === parentId && Number(node.userId ?? 1) === userId,
      );
      if (!parent) {
        throw new Error('Parent taxonomy node not found for user');
      }
    }

    const newNode = {
      id: nextTaxonomyId(),
      userId,
      label: data.label,
      nodeType: data.nodeType,
      level: Number(data.level),
      parentId,
      sortOrder: Number(data.sortOrder ?? 0),
      isActive: data.isActive ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockInvestmentAssetTaxonomy.push(newNode);
    return newNode;
  }

  async findAll(userId: number): Promise<any[]> {
    return [...mockInvestmentAssetTaxonomy].sort((left, right) => {
      if (Number(left.userId ?? 1) !== Number(right.userId ?? 1)) {
        return Number(left.userId ?? 1) - Number(right.userId ?? 1);
      }
      if (left.level !== right.level) return left.level - right.level;
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return left.label.localeCompare(right.label);
    }).filter((node) => Number(node.userId ?? 1) === Number(userId));
  }

  async findOne(id: number, userId: number): Promise<any> {
    return (
      mockInvestmentAssetTaxonomy.find(
        (node) => node.id === id && Number(node.userId ?? 1) === Number(userId),
      ) || null
    );
  }

  async update(id: number, userId: number, data: any): Promise<any> {
    const index = mockInvestmentAssetTaxonomy.findIndex(
      (node) => node.id === id && Number(node.userId ?? 1) === Number(userId),
    );
    if (index === -1) return null;

    if (data.parentId !== undefined) {
      const parentId = normalizeNullableNumber(data.parentId);
      if (parentId) {
        const parent = mockInvestmentAssetTaxonomy.find(
          (node) => node.id === parentId && Number(node.userId ?? 1) === Number(userId),
        );
        if (!parent) {
          throw new Error('Parent taxonomy node not found for user');
        }
      }
    }

    mockInvestmentAssetTaxonomy[index] = {
      ...mockInvestmentAssetTaxonomy[index],
      ...data,
      parentId: data.parentId !== undefined ? normalizeNullableNumber(data.parentId) : mockInvestmentAssetTaxonomy[index].parentId,
      level: data.level !== undefined ? Number(data.level) : mockInvestmentAssetTaxonomy[index].level,
      sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : mockInvestmentAssetTaxonomy[index].sortOrder,
      updatedAt: new Date(),
    };

    return mockInvestmentAssetTaxonomy[index];
  }

  async delete(id: number, userId: number): Promise<void> {
    mockInvestmentAssetTaxonomy = mockInvestmentAssetTaxonomy.filter(
      (node) =>
        !(
          Number(node.userId ?? 1) === Number(userId) &&
          (node.id === id || node.parentId === id)
        ),
    );
  }
}