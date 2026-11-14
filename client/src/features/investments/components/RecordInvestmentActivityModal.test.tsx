import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '../../../test/test-utils';
import { useNotificationStore } from '../../../store/notificationStore';
import RecordInvestmentActivityModal from './RecordInvestmentActivityModal';

const mocks = vi.hoisted(() => ({
  recordContribution: vi.fn(),
  recordWithdrawal: vi.fn(),
  recordIncomeCredit: vi.fn(),
  updateInvestmentEvent: vi.fn(),
  createInvestmentBenefit: vi.fn(),
  updateInvestmentBenefit: vi.fn(),
  realizeInvestmentBenefit: vi.fn(),
  quickRealizeInvestmentBenefit: vi.fn(),
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
  useRealizeInvestmentBenefit: () => ({ mutateAsync: mocks.realizeInvestmentBenefit }),
  useQuickRealizeInvestmentBenefit: () => ({ mutateAsync: mocks.quickRealizeInvestmentBenefit }),
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
  mocks.realizeInvestmentBenefit.mockResolvedValue({});
  mocks.quickRealizeInvestmentBenefit.mockResolvedValue({});
  mocks.skipContribution.mockResolvedValue({});
});

afterEach(() => vi.restoreAllMocks());

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
      requestId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
      investmentId: 'investment-1',
      contributionPlanId: 'plan-1',
      amount: 125,
      transactionDate: expect.any(String),
      notes: 'Contribution for Secure Future Policy',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(pushNotification).toHaveBeenCalledWith({
      type: 'success',
      message: 'Contribution recorded successfully',
    });
  });

  it('prevents recording a contribution that exceeds the linked account balance', () => {
    renderModal({
      accounts: [{ ...accounts[0], currentBalance: 100 }],
    });

    expect(screen.getByText(/Insufficient balance in Primary Account/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record Contribution' })).toBeDisabled();
    expect(mocks.recordContribution).not.toHaveBeenCalled();
  });

  it('records an income credit without creating an account transaction', async () => {
    const user = userEvent.setup();
    renderModal({ contributionPlan: undefined });

    await user.click(screen.getByRole('button', { name: 'Income Credit' }));
    await user.type(screen.getByLabelText('Amount'), '75');
    await user.click(screen.getByRole('button', { name: 'Capture Income Credit' }));

    await waitFor(() => expect(mocks.recordIncomeCredit).toHaveBeenCalledWith({
      investmentId: 'investment-1',
      payload: expect.objectContaining({
        eventType: 'INCOME_CREDIT',
        status: 'CONFIRMED',
        amount: 75,
        netAmount: 75,
        notes: undefined,
      }),
    }));
    expect(mocks.recordContribution).not.toHaveBeenCalled();
  });

  it('rejects a principal withdrawal larger than the invested amount', async () => {
    const user = userEvent.setup();
    renderModal({ contributionPlan: undefined });

    await user.click(screen.getByRole('button', { name: 'Principal Withdrawal' }));
    await user.type(screen.getByLabelText('Amount'), '1001');
    await user.click(screen.getByRole('button', { name: 'Record Withdrawal' }));

    expect(screen.getByText('Withdrawal cannot exceed invested principal.')).toBeInTheDocument();
    expect(mocks.recordWithdrawal).not.toHaveBeenCalled();
  });

  it('records a principal withdrawal with the entered notes', async () => {
    const user = userEvent.setup();
    renderModal({ contributionPlan: undefined });

    await user.click(screen.getByRole('button', { name: 'Principal Withdrawal' }));
    await user.type(screen.getByLabelText('Amount'), '250');
    await user.type(screen.getByRole('textbox', { name: 'Notes (Optional)' }), 'Partial redemption');
    await user.click(screen.getByRole('button', { name: 'Record Withdrawal' }));

    await waitFor(() => expect(mocks.recordWithdrawal).toHaveBeenCalledWith({
      requestId: expect.any(String),
      investmentId: 'investment-1',
      amount: 250,
      transactionDate: expect.any(String),
      notes: 'Partial redemption',
    }));
  });

  it('creates a benefit with its selected destination account', async () => {
    const user = userEvent.setup();
    renderModal({ contributionPlan: undefined });

    await user.click(screen.getByRole('button', { name: 'Benefit' }));
    await user.type(screen.getByLabelText('Amount'), '800');
    await user.click(screen.getByRole('button', { name: 'Add Benefit' }));

    await waitFor(() => expect(mocks.createInvestmentBenefit).toHaveBeenCalledWith({
      investmentId: 'investment-1',
      payload: {
        benefitType: 'MATURITY',
        amount: 800,
        benefitDate: expect.any(String),
        notes: undefined,
        destinationAccountId: 7,
      },
    }));
  });

  it('updates an existing income-credit event without changing its identity', async () => {
    const user = userEvent.setup();
    renderModal({
      editingEvent: {
        id: 'event-5',
        eventType: 'INCOME_CREDIT',
        amount: 40,
        eventDate: '2026-10-10',
        notes: 'Interest',
      },
      contributionPlan: undefined,
    });

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '55');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mocks.updateInvestmentEvent).toHaveBeenCalledWith({
      investmentId: 'investment-1',
      eventId: 'event-5',
      payload: {
        eventDate: '2026-10-10',
        amount: 55,
        netAmount: 55,
        notes: 'Interest',
      },
    }));
    expect(mocks.recordIncomeCredit).not.toHaveBeenCalled();
  });

  it('requires confirmation before realizing and closing a surrender benefit', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({
      onClose,
      realizationBenefit: {
        id: 'benefit-9',
        amount: 400,
        benefitDate: '2026-10-10',
        benefitType: 'SURRENDER',
        destinationAccountId: 7,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Save and Realize' }));
    expect(mocks.realizeInvestmentBenefit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm and Realize' }));

    await waitFor(() => expect(mocks.realizeInvestmentBenefit).toHaveBeenCalledWith({
      investmentId: 'investment-1',
      benefitId: 'benefit-9',
      payload: expect.objectContaining({
        benefitAmount: 400,
        benefitDate: '2026-10-10',
        destinationAccountId: 7,
        closesInvestment: true,
      }),
    }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('quick-realizes a closure after the user confirms the settlement', async () => {
    const user = userEvent.setup();
    renderModal({ closeMode: true, contributionPlan: undefined });

    await user.click(screen.getByRole('button', { name: 'Save and Realize' }));
    await user.click(screen.getByRole('button', { name: 'Confirm and Close' }));

    await waitFor(() => expect(mocks.quickRealizeInvestmentBenefit).toHaveBeenCalledWith({
      investmentId: 'investment-1',
      payload: expect.objectContaining({
        benefitType: 'SURRENDER',
        amount: 1200,
        destinationAccountId: 7,
        closesInvestment: true,
      }),
    }));
  });

  it('preserves a failed scheduled-contribution skip and allows retry', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mocks.skipContribution.mockRejectedValueOnce(new Error('Schedule unavailable'));
    renderModal({ onClose });

    await user.click(screen.getByRole('button', { name: 'Skip Current' }));
    expect(await screen.findByText('Schedule unavailable')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Skip Current' }));

    await waitFor(() => expect(mocks.skipContribution).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});