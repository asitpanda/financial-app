import { Injectable } from '@nestjs/common';
import type { InvestmentRecord } from '../investment.types';
import { CreateInvestmentDto } from '../dto/create-investment.dto';
import { UpdateInvestmentDto } from '../dto/update-investment.dto';
import { IInvestmentDataSourcePort } from './investment.datasource.port';
import { mockInvestmentsData } from '../../mockdata';

let mockInvestments = [...mockInvestmentsData];

const normalizeDate = (value?: string | Date | null) => (value ? new Date(value) : null);
const nextInvestmentId = () => (mockInvestments.length ? Math.max(...mockInvestments.map((investment) => investment.id)) + 1 : 1);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

const ASSET_TYPE_META_ID_BY_CODE: Record<string, number> = {
  DEPOSIT: 1,
  EQUITY: 2,
  DEBT: 3,
  RETIREMENT: 4,
  INSURANCE: 5,
  COMMODITY: 6,
  REAL_ESTATE: 7,
  ALTERNATIVE: 8,
};

const ASSET_CATEGORY_META_ID_BY_CODE: Record<string, number> = {
  BANK_DEPOSIT: 9,
  FIXED_DEPOSIT: 10,
  RECURRING_DEPOSIT: 11,
  STOCK: 12,
  MUTUAL_FUND: 13,
  ETF: 14,
  INDEX_FUND: 15,
  BOND: 16,
  DEBT_MUTUAL_FUND: 17,
  GOVERNMENT_SECURITY: 18,
  PPF: 19,
  NPS: 20,
  EPF: 21,
  PENSION_PLAN: 22,
  LIFE_INSURANCE: 23,
  ULIP: 24,
  HEALTH_INSURANCE: 25,
  GOLD: 26,
  SILVER: 27,
  COMMODITY_FUND: 28,
  PROPERTY: 29,
  REIT: 30,
  LAND: 31,
  CRYPTO: 32,
  PRIVATE_EQUITY: 33,
  COLLECTIBLE: 34,
  OTHER_ALTERNATIVE: 35,
};

@Injectable()
export class InvestmentMockRepository implements IInvestmentDataSourcePort {
  async create(data: CreateInvestmentDto, userId: number): Promise<InvestmentRecord> {
    const timestamp = new Date();
    const assetTypeMetaId = ASSET_TYPE_META_ID_BY_CODE[data.assetType];
    const assetCategoryMetaId = ASSET_CATEGORY_META_ID_BY_CODE[data.assetCategory];
    const newInvestment: InvestmentRecord = {
      id: nextInvestmentId(),
      ...data,
      accountId: normalizeNullableNumber(data.accountId),
      assetTaxonomyId: normalizeNullableNumber(data.assetTaxonomyId),
      assetTypeMetaId,
      assetCategoryMetaId,
      institutionName: data.institutionName ?? null,
      referenceNumber: data.referenceNumber ?? null,
      currentValue: data.currentValue ?? 0,
      currentValueSource: data.currentValueSource ?? null,
      insuranceCover: data.insuranceCover ?? null,
      contributionMode: data.contributionMode ?? 'ONE_TIME',
      notes: data.notes ?? null,
      startDate: normalizeDate(data.startDate),
      maturityDate: normalizeDate(data.maturityDate),
      lastValuationAt: normalizeDate(data.lastValuationAt),
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockInvestments.unshift(newInvestment);
    return newInvestment;
  }

  async findAll(userId: number): Promise<InvestmentRecord[]> {
    return mockInvestments.filter((investment) => investment.userId === userId);
  }

  async findOne(id: number, userId: number): Promise<InvestmentRecord | null> {
    return mockInvestments.find((investment) => investment.id === id && investment.userId === userId);
  }

  async findById(id: number): Promise<InvestmentRecord | null> {
    return mockInvestments.find((investment) => investment.id === id);
  }

  async update(id: number, data: UpdateInvestmentDto, userId: number): Promise<InvestmentRecord | null> {
    const index = mockInvestments.findIndex((investment) => investment.id === id && investment.userId === userId);
    if (index === -1) return null;

    mockInvestments[index] = {
      ...mockInvestments[index],
      ...data,
      accountId: data.accountId !== undefined ? normalizeNullableNumber(data.accountId) : mockInvestments[index].accountId,
      assetTaxonomyId: data.assetTaxonomyId !== undefined ? normalizeNullableNumber(data.assetTaxonomyId) : mockInvestments[index].assetTaxonomyId,
      assetTypeMetaId:
        data.assetType !== undefined
          ? ASSET_TYPE_META_ID_BY_CODE[data.assetType]
          : mockInvestments[index].assetTypeMetaId,
      assetCategoryMetaId:
        data.assetCategory !== undefined
          ? ASSET_CATEGORY_META_ID_BY_CODE[data.assetCategory]
          : mockInvestments[index].assetCategoryMetaId,
      institutionName: data.institutionName !== undefined ? data.institutionName : mockInvestments[index].institutionName,
      referenceNumber: data.referenceNumber !== undefined ? data.referenceNumber : mockInvestments[index].referenceNumber,
      currentValue: data.currentValue !== undefined ? data.currentValue : mockInvestments[index].currentValue,
      currentValueSource:
        data.currentValueSource !== undefined ? data.currentValueSource : mockInvestments[index].currentValueSource,
      insuranceCover: data.insuranceCover !== undefined ? data.insuranceCover : mockInvestments[index].insuranceCover,
      contributionMode:
        data.contributionMode !== undefined
          ? data.contributionMode
          : mockInvestments[index].contributionMode ?? 'ONE_TIME',
      notes: data.notes !== undefined ? data.notes : mockInvestments[index].notes,
      startDate: data.startDate !== undefined ? normalizeDate(data.startDate) : mockInvestments[index].startDate,
      maturityDate: data.maturityDate !== undefined ? normalizeDate(data.maturityDate) : mockInvestments[index].maturityDate,
      lastValuationAt: data.lastValuationAt !== undefined ? normalizeDate(data.lastValuationAt) : mockInvestments[index].lastValuationAt,
      updatedAt: new Date(),
    };

    return mockInvestments[index];
  }

  async delete(id: number, userId: number): Promise<void> {
    mockInvestments = mockInvestments.filter((investment) => !(investment.id === id && investment.userId === userId));
  }
}