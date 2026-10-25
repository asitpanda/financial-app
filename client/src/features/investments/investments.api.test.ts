import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import * as investmentApi from './api/investments.api';
import * as eventsApi from './api/investmentEvents.api';
import * as snapshotsApi from './api/valuationSnapshots.api';
import * as benefitsApi from './api/investmentBenefits.api';
import * as plansApi from './api/contributionPlans.api';
import * as taxonomyApi from './api/investmentAssetTaxonomy.api';
import type { CreateInvestmentDto } from './types/investment.types';

afterEach(() => vi.restoreAllMocks());

describe('investment APIs', () => {
  it('uses the investment read and mutation contracts', async () => {
    const data = { id: 'investment-1' };
    const page = {
      data: [data],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false },
    };
    const get = vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: page } as never)
      .mockResolvedValue({ data } as never);
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data } as never);
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data } as never);
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({} as never);
    const payload = { name: 'Fund' } as CreateInvestmentDto;

    await expect(investmentApi.getInvestments()).resolves.toBe(page);
    await expect(investmentApi.getInvestmentById('investment-1')).resolves.toBe(data);
    await expect(investmentApi.getInvestmentPerformanceById('investment-1')).resolves.toBe(data);
    await expect(investmentApi.getInvestmentDashboardAnalytics()).resolves.toBe(data);
    await expect(investmentApi.getInvestmentMetadata()).resolves.toBe(data);
    await expect(investmentApi.createInvestment(payload)).resolves.toBe(data);
    await expect(
      investmentApi.updateInvestment('investment-1', { ...payload, id: 'wrong-id' } as never),
    ).resolves.toBe(data);
    await expect(investmentApi.deleteInvestment('investment-1')).resolves.toBeUndefined();

    expect(get).toHaveBeenNthCalledWith(1, '/investments', { params: { page: 1, limit: 25 } });
    expect(get).toHaveBeenNthCalledWith(2, '/investments/investment-1');
    expect(get).toHaveBeenNthCalledWith(3, '/investments/investment-1/performance');
    expect(get).toHaveBeenNthCalledWith(4, '/investments/dashboard');
    expect(get).toHaveBeenNthCalledWith(5, '/investments/metadata');
    expect(post).toHaveBeenCalledWith('/investments', payload);
    expect(patch).toHaveBeenCalledWith('/investments/investment-1', { name: 'Fund' });
    expect(remove).toHaveBeenCalledWith('/investments/investment-1');
  });

  it('covers events, snapshots, benefits, plans, and taxonomy endpoints', async () => {
    const data = { id: 1 };
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data } as never);
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data } as never);
    vi.spyOn(apiClient, 'patch').mockResolvedValue({ data } as never);
    vi.spyOn(apiClient, 'delete').mockResolvedValue({} as never);

    await eventsApi.getInvestmentEventsByInvestmentId(1);
    await eventsApi.createInvestmentEvent(1, {});
    await eventsApi.updateInvestmentEvent(1, 2, {});
    await eventsApi.deleteInvestmentEvent(1, 2);
    await snapshotsApi.getValuationSnapshots();
    await snapshotsApi.getValuationSnapshotsByInvestment(1);
    await snapshotsApi.getValuationSnapshotById(1, 2);
    await snapshotsApi.createValuationSnapshot({ investmentId: 1, snapshotDate: '2026-01-01', marketValue: 10 });
    await snapshotsApi.updateValuationSnapshot(1, 2, {});
    await snapshotsApi.deleteValuationSnapshot(1, 2);
    await benefitsApi.getInvestmentBenefits();
    await benefitsApi.getInvestmentBenefitsByInvestmentId(1);
    await benefitsApi.getInvestmentBenefit(1, 2);
    await benefitsApi.createInvestmentBenefit(1, { benefitType: 'BONUS', amount: 10, benefitDate: '2026-01-01' });
    await benefitsApi.updateInvestmentBenefit(1, 2, { amount: 20 });
    await benefitsApi.deleteInvestmentBenefit(1, 2);
    await benefitsApi.realizeInvestmentBenefit(1, 2, { components: [] });
    await benefitsApi.quickRealizeInvestmentBenefit(1, { eventType: 'BONUS', amount: 10, benefitType: 'BONUS' });
    await plansApi.recordInvestmentContribution({ investmentId: 1 });
    await plansApi.recordInvestmentWithdrawal({ investmentId: 1 });
    await plansApi.previewRecurringContributionPlan(1, {});
    await plansApi.confirmRecurringContributionPlan(1, {});
    await plansApi.updateContributionPlan(1, 2, {});
    await plansApi.skipCurrentContributionPlan(1, 2);
    await taxonomyApi.getInvestmentAssetTaxonomy();
    await taxonomyApi.createInvestmentAssetTaxonomy({ label: 'Equity', nodeType: 'category', level: 1 });
    await taxonomyApi.updateInvestmentAssetTaxonomy(1, { label: 'Updated' });
    await taxonomyApi.deleteInvestmentAssetTaxonomy(1);

    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/investment-benefits');
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/investments/1/contribution-plans/confirm', {});
    expect(vi.mocked(apiClient.delete)).toHaveBeenCalledWith('/investment-asset-taxonomy/1');
  });

  it('normalizes malformed list responses to empty arrays', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: null } as never);
    await expect(eventsApi.getInvestmentEventsByInvestmentId(1)).resolves.toEqual([]);
    await expect(snapshotsApi.getValuationSnapshots()).resolves.toEqual([]);
    await expect(benefitsApi.getInvestmentBenefits()).resolves.toEqual([]);
    await expect(benefitsApi.getInvestmentBenefitsByInvestmentId(1)).resolves.toEqual([]);
  });

});