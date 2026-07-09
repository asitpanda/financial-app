import { Injectable } from '@nestjs/common';
import { IInvestmentAssetTaxonomyRepository } from './investment-asset-taxonomy.repository.interface';
import { mockInvestmentAssetTaxonomyData } from '../../mockdata';

let mockInvestmentAssetTaxonomy = [...mockInvestmentAssetTaxonomyData];

const nextTaxonomyId = () =>
  (mockInvestmentAssetTaxonomy.length ? Math.max(...mockInvestmentAssetTaxonomy.map((node) => node.id)) + 1 : 1);

const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class MockInvestmentAssetTaxonomyRepository implements IInvestmentAssetTaxonomyRepository {
  async create(data: any): Promise<any> {
    const timestamp = new Date();
    const newNode = {
      id: nextTaxonomyId(),
      label: data.label,
      nodeType: data.nodeType,
      level: Number(data.level),
      parentId: normalizeNullableNumber(data.parentId),
      sortOrder: Number(data.sortOrder ?? 0),
      isActive: data.isActive ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockInvestmentAssetTaxonomy.push(newNode);
    return newNode;
  }

  async findAll(): Promise<any[]> {
    return [...mockInvestmentAssetTaxonomy].sort((left, right) => {
      if (left.level !== right.level) return left.level - right.level;
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return left.label.localeCompare(right.label);
    });
  }

  async findOne(id: number): Promise<any> {
    return mockInvestmentAssetTaxonomy.find((node) => node.id === id) || null;
  }

  async update(id: number, data: any): Promise<any> {
    const index = mockInvestmentAssetTaxonomy.findIndex((node) => node.id === id);
    if (index === -1) return null;

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

  async delete(id: number): Promise<void> {
    mockInvestmentAssetTaxonomy = mockInvestmentAssetTaxonomy.filter((node) => node.id !== id && node.parentId !== id);
  }
}