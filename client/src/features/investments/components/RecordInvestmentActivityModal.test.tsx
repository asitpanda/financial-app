import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../../../test/test-utils';
import { useNotificationStore } from '../../../store/notificationStore';
import RecordInvestmentActivityModal from './RecordInvestmentActivityModal';

const mocks = vi.hoisted(() => ({
  recordContribution: vi.fn(),
  recordWithdrawal: vi.fn(),
  recordIncomeCredit: vi.fn(),
  updateInvestmentEvent: vi.fn(),
  createInvestmentBenefit: vi.fn(),
  updateInvestmentBenefit: vi.fn(),
  skipContribution: vi.fn(),
}));

vi.mock('../hooks/useContributionPlans', () => ({
  useRecordInvestmentContribution: () => ({ mutateAsync: mocks.recordContribution }),
  useRecordInvestmentWithdrawal: () => ({ mutateAsync: mocks.recordWithdrawal }),
  useRecordInvestmentIncomeCredit: () => ({ mutateAsync: mocks.recordIncomeCredit }),
  useUpdateInvestmentEvent: () => ({ mutateAsync: mocks.updateInvestmentEvent }),
  useSkipCurrentInvestmentContribution: () => ({ mutateAsync: mocks.skipContribution }),
}));

vi.mock('../hooks/useInvestmentBenefits', () => ({
  useCreateInvestmentBenefit: () => ({ mutateAsync: mocks.createInvestmentBenefit }),
  useUpdateInvestmentBenefit: () => ({ mutateAsync: mocks.updateInvestmentBenefit }),
}));

const investment = {
  id: 'investment-1',
  name: 'Secure Future Policy',
  accountId: 7,
  currentValue: 1200,
  totalInvested: 1000,
};

const contributionPlan = {
  id: 'plan-1',
  amount: 125,
  nextDueDate: '2026-11-01',
};

const accounts = [{
  id: 7,
  name: 'Primary Account',
  currentBalance: 5000,
  isActive: true,
}];

const renderModal = (overrides = {}) =>
  renderWithProviders(
    <RecordInvestmentActivityModal
      open
      onClose={vi.fn()}
      investment={investment}
      contributionPlan={contributionPlan}
      accounts={accounts}
      {...overrides}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.recordContribution.mockResolvedValue({ id: 'event-1' });
  mocks.recordWithdrawal.mockResolvedValue({ id: 'event-2' });
  mocks.recordIncomeCredit.mockResolvedValue({ id: 'event-3' });
  mocks.updateInvestmentEvent.mockResolvedValue({ id: 'event-4' });
  mocks.createInvestmentBenefit.mockResolvedValue({ id: 'benefit-1' });
  mocks.updateInvestmentBenefit.mockResolvedValue({ id: 'benefit-2' });
  mocks.skipContribution.mockResolvedValue({});
});

describe('RecordInvestmentActivityModal', () => {
  it('renders the contribution context and rejects an empty amount', async () => {
    const user = userEvent.setup();
    renderModal({ contributionPlan: undefined });

    expect(screen.getByRole('heading', { name: 'Record Investment Activity' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Primary Account')).toBeInTheDocument();
    expect(screen.getByText('Current available amount:')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Record Contribution' }));

    expect(screen.getByText('Enter a positive amount.')).toBeInTheDocument();
    expect(mocks.recordContribution).not.toHaveBeenCalled();
  });

  it('records a scheduled contribution and closes after success', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const pushNotification = vi.spyOn(useNotificationStore.getState(), 'pushNotification');
    renderModal({ onClose });

    await user.click(screen.getByRole('button', { name: 'Record Contribution' }));

    expect(mocks.recordContribution).toHaveBeenCalledWith({
      investmentId: 'investment-1',
      contributionPlanId: 'plan-1',
      amount: 125,
      transactionDate: expect.any(String),
      notes: 'Contribution for Secure Future Policy',
    });
    expect(pushNotification).toHaveBeenCalledWith({
      type: 'success',
      message: 'Contribution recorded successfully',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});