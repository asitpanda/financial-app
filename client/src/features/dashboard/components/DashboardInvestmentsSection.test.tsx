import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DashboardInvestmentsSection from './DashboardInvestmentsSection';

const summary = {
  activeCount: 2, periodTotalInvested: 1000, periodCurrentValue: 1200, periodUnrealisedGain: 200,
  periodUnrealisedGainPct: 20, insuranceCover: 5000, insuranceSavingsContribution: 0,
  protectionExpenseTotal: 0, allocationBreakdown: [{ key: 'equity', label: 'Equity', value: 1000, pct: 100 }],
  upcomingContributionAmount: 100, upcomingMaturityAmount: 0,
  actionItems: [{ id: 'investment-1', name: 'Index Fund', kind: 'due' as const, date: '2026-01-20', amount: 100 }],
  actionItemsTotalCount: 1, staleValuationCount: 1,
};

describe('DashboardInvestmentsSection', () => {
  it('renders allocations, action items, and valuation alerts', () => {
    render(<DashboardInvestmentsSection investments={[{ id: 'investment-1', name: 'Index Fund', status: 'active', totalInvested: 1000 }] as never} investmentSummary={summary} onOpenInvestments={vi.fn()} onAddInvestment={vi.fn()} />);
    expect(screen.getByText('Equity')).toBeInTheDocument();
    expect(screen.getByText('Index Fund')).toBeInTheDocument();
    expect(screen.getByText('Due')).toBeInTheDocument();
    expect(screen.getByText('1 holding unvalued 90+ days →')).toBeInTheDocument();
    expect(screen.getByText('₹5,000', { exact: false })).toBeInTheDocument();
  });

  it('offers add investment from the empty state', async () => {
    const user = userEvent.setup();
    const onAddInvestment = vi.fn();
    render(<DashboardInvestmentsSection investments={[]} investmentSummary={{ ...summary, actionItems: [], actionItemsTotalCount: 0, allocationBreakdown: [], staleValuationCount: 0 }} onOpenInvestments={vi.fn()} onAddInvestment={onAddInvestment} />);
    await user.click(screen.getByRole('button', { name: 'Add Investment' }));
    expect(onAddInvestment).toHaveBeenCalledOnce();
  });
});