import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../../../test/test-utils';
import RecurringOccurrencesReviewDialog from './RecurringOccurrencesReviewDialog';

const baseProps = {
  open: true,
  loading: false,
  investmentName: 'Retirement Fund',
  historicalImportMode: 'IMPORT_HISTORY',
  items: [
    { dueDate: '2026-01-01', amount: 100, status: 'CONFIRMED', eventType: 'CONTRIBUTION', notes: 'Principal' },
    { dueDate: '2026-02-01', amount: 10, status: 'PENDING', eventType: 'INCOME_CREDIT', notes: 'Interest' },
    { dueDate: '2026-03-01', amount: 999, status: 'PENDING', eventType: 'CONTRIBUTION', selected: false },
  ],
  reviewSummary: {
    investment: [{ label: 'Account', value: 'Savings' }],
    valuation: [{ label: 'Current value', value: '110' }],
    recurring: [{ label: 'Cadence', value: 'Monthly' }],
  },
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
};

describe('RecurringOccurrencesReviewDialog', () => {
  it('renders selected event totals and review sections', () => {
    renderWithProviders(<RecurringOccurrencesReviewDialog {...baseProps} />);

    expect(screen.getByText('Investment: Retirement Fund')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText(/Selected events: 2/)).toBeInTheDocument();
    expect(screen.getAllByText('1 selected')).toHaveLength(2);
    expect(screen.getByText('Total: 100.00')).toBeInTheDocument();
    expect(screen.getByText('Total: 10.00')).toBeInTheDocument();
    expect(screen.queryByText('999.00')).not.toBeInTheDocument();
  });

  it('shows the empty-history state and supports cancel/confirm actions', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    renderWithProviders(
      <RecurringOccurrencesReviewDialog
        {...baseProps}
        items={[]}
        reviewSummary={undefined}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('No historical occurrences generated for this plan.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables close and confirmation while loading', () => {
    renderWithProviders(<RecurringOccurrencesReviewDialog {...baseProps} loading />);
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirming...' })).toBeDisabled();
  });
});