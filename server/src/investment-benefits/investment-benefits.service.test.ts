import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvestmentBenefitStatus, InvestmentBenefitType, InvestmentEventType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialAccountsService } from '../financial-accounts/financial-accounts.service';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { InvestmentBenefitRecord } from './investment-benefit.types';
import { InvestmentBenefitsService } from './investment-benefits.service';
import { BenefitRepository } from './repositories/benefit.repository';

function createService() {
  const repository = {
    create: vi.fn(),
    findAll: vi.fn(),
    findAllByInvestmentWithDetails: vi.fn(),
    findOne: vi.fn(),
    findOneWithDetails: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    realize: vi.fn(),
    quickRealize: vi.fn(),
  };
  const investmentRepository = { findOne: vi.fn() };
  const financialAccountsService = { findOne: vi.fn() };

  return {
    service: new InvestmentBenefitsService(
      repository as unknown as BenefitRepository,
      investmentRepository as unknown as InvestmentRepository,
      financialAccountsService as unknown as FinancialAccountsService,
    ),
    repository,
    investmentRepository,
    financialAccountsService,
  };
}

function benefit(overrides: Partial<InvestmentBenefitRecord> = {}): InvestmentBenefitRecord {
  return {
    id: 3,
    investmentId: 7,
    benefitType: InvestmentBenefitType.COUPON,
    amount: 100,
    benefitDate: new Date('2026-10-25T00:00:00.000Z'),
    status: InvestmentBenefitStatus.EXPECTED,
    destinationAccountId: null,
    notes: null,
    createdAt: new Date('2026-10-25T00:00:00.000Z'),
    updatedAt: new Date('2026-10-25T00:00:00.000Z'),
    ...overrides,
  };
}

function investment(overrides: Record<string, unknown> = {}) {
  return { status: 'active', accountId: 10, currency: 'USD', ...overrides };
}

describe('InvestmentBenefitsService', () => {
  let service: InvestmentBenefitsService;
  let repository: ReturnType<typeof createService>['repository'];
  let investmentRepository: ReturnType<typeof createService>['investmentRepository'];
  let financialAccountsService: ReturnType<typeof createService>['financialAccountsService'];

  beforeEach(() => {
    ({ service, repository, investmentRepository, financialAccountsService } = createService());
    investmentRepository.findOne.mockResolvedValue(investment());
    financialAccountsService.findOne.mockResolvedValue({ currency: 'USD' });
  });

  describe('findAll', () => {
    it('returns the benefits for the current user', async () => {
      const benefits = [benefit()];
      repository.findAll.mockResolvedValue(benefits);

      await expect(service.findAll(42)).resolves.toBe(benefits);
      expect(repository.findAll).toHaveBeenCalledWith(42);
    });
  });

  describe('findAllByInvestment', () => {
    it('returns detailed benefits after confirming investment ownership', async () => {
      const benefits = [benefit()];
      repository.findAllByInvestmentWithDetails.mockResolvedValue(benefits);

      await expect(service.findAllByInvestment('7', 42)).resolves.toBe(benefits);
      expect(investmentRepository.findOne).toHaveBeenCalledWith(7, 42);
      expect(repository.findAllByInvestmentWithDetails).toHaveBeenCalledWith('7');
    });

    it('does not return benefits for an investment the user does not own', async () => {
      investmentRepository.findOne.mockResolvedValue(null);

      await expect(service.findAllByInvestment('7', 42)).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.findAllByInvestmentWithDetails).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('creates a zero-amount benefit for an owned open investment', async () => {
      const data = { benefitType: InvestmentBenefitType.COUPON, amount: 0 };
      repository.create.mockResolvedValue(benefit({ amount: 0 }));

      await expect(service.create('7', data as never, 42)).resolves.toEqual(benefit({ amount: 0 }));
      expect(repository.create).toHaveBeenCalledWith('7', data);
    });

    it('rejects a negative amount without creating the benefit', async () => {
      await expect(service.create('7', { amount: -1 } as never, 42)).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects modifications to a closed investment', async () => {
      investmentRepository.findOne.mockResolvedValue(investment({ status: ' Closed ' }));

      await expect(service.create('7', { amount: 10 } as never, 42)).rejects.toThrow(
        'Closed investments cannot be modified.',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a destination account that is not available to the user', async () => {
      financialAccountsService.findOne.mockResolvedValue(null);

      await expect(
        service.create('7', { amount: 10, destinationAccountId: 55 } as never, 42),
      ).rejects.toThrow('Destination account was not found for the current user.');
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a benefit belonging to the requested owned investment', async () => {
      const savedBenefit = benefit();
      repository.findOne.mockResolvedValue(savedBenefit);

      await expect(service.findOne('3', '7', 42)).resolves.toBe(savedBenefit);
      expect(investmentRepository.findOne).toHaveBeenCalledWith(7, 42);
    });

    it('returns not found when the benefit is missing or belongs to another investment', async () => {
      repository.findOne.mockResolvedValue(benefit({ investmentId: 8 }));

      await expect(service.findOne('3', '7', 42)).rejects.toBeInstanceOf(NotFoundException);
      expect(investmentRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findOneWithDetails', () => {
    it('returns the detailed benefit from the repository', async () => {
      const savedBenefit = { ...benefit(), realizedEvents: [] };
      repository.findOneWithDetails.mockResolvedValue(savedBenefit);

      await expect(service.findOneWithDetails('3', '7', 42)).resolves.toBe(savedBenefit);
      expect(repository.findOneWithDetails).toHaveBeenCalledWith('3');
    });
  });

  describe('update', () => {
    it('allows an expected benefit to be marked received', async () => {
      repository.findOne.mockResolvedValue(benefit());
      repository.update.mockResolvedValue(benefit({ status: InvestmentBenefitStatus.RECEIVED }));
      const data = { status: InvestmentBenefitStatus.RECEIVED };

      await expect(service.update('3', '7', data, 42)).resolves.toMatchObject(data);
      expect(repository.update).toHaveBeenCalledWith('3', data);
    });

    it('rejects changing the status of a benefit that is no longer expected', async () => {
      repository.findOne.mockResolvedValue(benefit({ status: InvestmentBenefitStatus.RECEIVED }));

      await expect(
        service.update('3', '7', { status: InvestmentBenefitStatus.CANCELLED }, 42),
      ).rejects.toThrow('Only expected benefits can change status.');
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a benefit only after validating ownership and investment status', async () => {
      repository.findOne.mockResolvedValue(benefit());
      repository.delete.mockResolvedValue(undefined);

      await expect(service.remove('3', '7', 42)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith('3');
    });
  });

  describe('realize', () => {
    it('realizes an expected benefit when component amounts equal its amount', async () => {
      repository.findOne.mockResolvedValue(benefit());
      const data = {
        components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 100 }],
      };
      repository.realize.mockResolvedValue(benefit({ status: InvestmentBenefitStatus.RECEIVED }));

      await expect(service.realize('3', '7', data, 42)).resolves.toMatchObject({
        status: InvestmentBenefitStatus.RECEIVED,
      });
      expect(financialAccountsService.findOne).toHaveBeenCalledWith(10, 42);
      expect(repository.realize).toHaveBeenCalledWith('3', '7', 42, data);
    });

    it('rejects realization components whose total differs from the benefit amount', async () => {
      repository.findOne.mockResolvedValue(benefit());

      await expect(
        service.realize(
          '3',
          '7',
          { components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 99 }] },
          42,
        ),
      ).rejects.toThrow('Realization component amounts must equal the benefit amount.');
      expect(repository.realize).not.toHaveBeenCalled();
    });

    it('rejects a destination account with a different currency from the investment', async () => {
      repository.findOne.mockResolvedValue(benefit());
      financialAccountsService.findOne.mockResolvedValue({ currency: 'EUR' });

      await expect(
        service.realize(
          '3',
          '7',
          {
            destinationAccountId: 11,
            components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 100 }],
          },
          42,
        ),
      ).rejects.toThrow('Benefit cash accounts must use the investment currency.');
      expect(repository.realize).not.toHaveBeenCalled();
    });
  });

  describe('quickRealize', () => {
    it('validates the amount and delegates realization for an open investment', async () => {
      const data = { eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 25 };
      repository.quickRealize.mockResolvedValue(benefit({ amount: 25 }));

      await expect(service.quickRealize('7', data as never, 42)).resolves.toEqual(benefit({ amount: 25 }));
      expect(repository.quickRealize).toHaveBeenCalledWith('7', 42, data);
    });

    it('rejects a non-finite amount without creating a benefit', async () => {
      await expect(
        service.quickRealize('7', { eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: Number.NaN } as never, 42),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.quickRealize).not.toHaveBeenCalled();
    });
  });
});