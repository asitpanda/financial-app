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

@Injectable()
export class InvestmentMockRepository implements IInvestmentDataSourcePort {
  async create(data: CreateInvestmentDto, userId: number): Promise<InvestmentRecord> {
    const timestamp = new Date();
    const newInvestment: InvestmentRecord = {
      id: nextInvestmentId(),
      ...data,
      accountId: normalizeNullableNumber(data.accountId),
      assetTaxonomyId: normalizeNullableNumber(data.assetTaxonomyId),
      holdingMode: data.holdingMode ?? null,
      institutionName: data.institutionName ?? null,
      referenceNumber: data.referenceNumber ?? null,
      currentValue: data.currentValue ?? 0,
      currentValueSource: data.currentValueSource ?? null,
      insuranceCover: data.insuranceCover ?? null,
      contributionMode: data.contributionMode ?? null,
      documentsMeta: data.documentsMeta ?? null,
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
      holdingMode: data.holdingMode !== undefined ? data.holdingMode : mockInvestments[index].holdingMode,
      institutionName: data.institutionName !== undefined ? data.institutionName : mockInvestments[index].institutionName,
      referenceNumber: data.referenceNumber !== undefined ? data.referenceNumber : mockInvestments[index].referenceNumber,
      currentValue: data.currentValue !== undefined ? data.currentValue : mockInvestments[index].currentValue,
      currentValueSource:
        data.currentValueSource !== undefined ? data.currentValueSource : mockInvestments[index].currentValueSource,
      insuranceCover: data.insuranceCover !== undefined ? data.insuranceCover : mockInvestments[index].insuranceCover,
      contributionMode: data.contributionMode !== undefined ? data.contributionMode : mockInvestments[index].contributionMode,
      documentsMeta: data.documentsMeta !== undefined ? data.documentsMeta : mockInvestments[index].documentsMeta,
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