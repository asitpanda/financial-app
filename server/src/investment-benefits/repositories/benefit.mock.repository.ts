import { Injectable } from '@nestjs/common';
import { InvestmentBenefitStatus } from '@prisma/client';
import { InvestmentEventStatus, InvestmentEventSource, InvestmentBenefitType } from '@prisma/client';
import { mockInvestmentsData } from '../../mockdata/investments';
import { mockInvestmentBenefitsData } from '../../mockdata/investmentBenefits';
import type { CreateInvestmentBenefitDto } from '../dto/create-investment-benefit.dto';
import type { UpdateInvestmentBenefitDto } from '../dto/update-investment-benefit.dto';
import type { InvestmentBenefitRecord } from '../investment-benefit.types';
import type { InvestmentEventRecord } from '../../investment-events/investment-event.types';
import type { QuickRealizeInvestmentBenefitDto, RealizeInvestmentBenefitDto } from '../dto/realize-investment-benefit.dto';
import type { IBenefitDataSourcePort } from './benefit.datasource.port';

let mockBenefits: InvestmentBenefitRecord[] = [...mockInvestmentBenefitsData];

const nextId = () => (mockBenefits.length ? Math.max(...mockBenefits.map((benefit) => benefit.id)) + 1 : 1);
const nextEventId = () => (mockInvestmentEvents.length ? Math.max(...mockInvestmentEvents.map((event) => event.id)) + 1 : 1);

import { mockInvestmentEventsData } from '../../mockdata';
let mockInvestmentEvents: InvestmentEventRecord[] = [...mockInvestmentEventsData];

@Injectable()
export class BenefitMockRepository implements IBenefitDataSourcePort {
  async create(investmentId: string, data: CreateInvestmentBenefitDto): Promise<InvestmentBenefitRecord> {
    const now = new Date();
    const benefit: InvestmentBenefitRecord = {
      id: nextId(),
      investmentId: Number(investmentId),
      benefitType: data.benefitType,
      amount: data.amount,
      benefitDate: new Date(data.benefitDate),
      status: InvestmentBenefitStatus.EXPECTED,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    mockBenefits.push(benefit);
    return benefit;
  }

  async findAll(userId: number) {
    const ownedIds = new Set(mockInvestmentsData.filter((investment) => investment.userId === userId).map((investment) => investment.id));
    return mockBenefits.filter((benefit) => ownedIds.has(benefit.investmentId));
  }

  async findAllByInvestment(investmentId: string) {
    return mockBenefits.filter((benefit) => benefit.investmentId === Number(investmentId));
  }

  async findAllByInvestmentWithDetails(investmentId: string) {
    return mockBenefits
      .filter((benefit) => benefit.investmentId === Number(investmentId))
      .map((benefit) => ({
        ...benefit,
        realizedEvents: mockInvestmentEvents.filter((event) => event.linkedBenefitId === benefit.id),
      }));
  }

  async findOne(id: string) {
    return mockBenefits.find((benefit) => benefit.id === Number(id)) ?? null;
  }

  async findOneWithDetails(id: string) {
    const benefit = mockBenefits.find((benefit) => benefit.id === Number(id));
    return benefit
      ? {
          ...benefit,
          realizedEvents: mockInvestmentEvents.filter((event) => event.linkedBenefitId === benefit.id),
        }
      : null;
  }

  async update(id: string, data: UpdateInvestmentBenefitDto) {
    const index = mockBenefits.findIndex((benefit) => benefit.id === Number(id));
    if (index < 0) return null;
    mockBenefits[index] = {
      ...mockBenefits[index],
      benefitType: data.benefitType ?? mockBenefits[index].benefitType,
      amount: data.amount ?? mockBenefits[index].amount,
      benefitDate: data.benefitDate ? new Date(data.benefitDate) : mockBenefits[index].benefitDate,
      status: data.status ?? mockBenefits[index].status,
      notes: data.notes !== undefined ? data.notes : mockBenefits[index].notes,
      updatedAt: new Date(),
    };
    return mockBenefits[index];
  }

  async delete(id: string) {
    mockBenefits = mockBenefits.filter((benefit) => benefit.id !== Number(id));
  }

  async realize(id: string, investmentId: string, userId: number, data: RealizeInvestmentBenefitDto) {
    const benefit = mockBenefits.find((item) => item.id === Number(id) && item.investmentId === Number(investmentId));
    const investment = mockInvestmentsData.find((item) => item.id === Number(investmentId) && item.userId === userId);
    if (!benefit || !investment) throw new Error('Investment benefit not found');
    if (benefit.status !== InvestmentBenefitStatus.EXPECTED) throw new Error('Investment benefit was already realized');

    const timestamp = new Date();
    const events = data.components.map((component) => ({
      id: nextEventId(),
      investmentId: Number(investmentId),
      recurringPlanId: null,
      linkedTransactionId: null,
      linkedBenefitId: benefit.id,
      eventType: component.eventType,
      dueDate: null,
      status: InvestmentEventStatus.CONFIRMED,
      eventSource: InvestmentEventSource.MANUAL,
      sequenceNumber: null,
      eventDate: component.eventDate ? new Date(component.eventDate) : timestamp,
      amount: component.amount,
      units: null,
      pricePerUnit: null,
      netAmount: null,
      notes: component.notes ?? null,
      meta: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies InvestmentEventRecord));
    mockInvestmentEvents.push(...events);
    const updatedBenefit = { ...benefit, status: InvestmentBenefitStatus.RECEIVED, updatedAt: timestamp };
    mockBenefits = mockBenefits.map((item) => item.id === benefit.id ? updatedBenefit : item);
    if (data.closesInvestment) {
      const investmentIndex = mockInvestmentsData.findIndex((item) => item.id === Number(investmentId));
      if (investmentIndex >= 0) {
        mockInvestmentsData[investmentIndex].status = benefit.benefitType === InvestmentBenefitType.MATURITY ? 'matured' : 'closed';
      }
    }
    return { benefit: updatedBenefit, events };
  }

  async quickRealize(investmentId: string, userId: number, data: QuickRealizeInvestmentBenefitDto) {
    const benefit = await this.create(investmentId, {
      benefitType: data.benefitType,
      amount: data.amount,
      benefitDate: data.benefitDate ?? new Date().toISOString(),
      notes: data.benefitNotes,
    });
    return this.realize(String(benefit.id), investmentId, userId, {
      components: [{
        eventType: data.eventType,
        amount: data.amount,
        eventDate: data.eventDate,
        notes: data.notes,
        transaction: data.transaction,
      }],
      closesInvestment: data.closesInvestment,
    });
  }
}