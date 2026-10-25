import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardMonthlySummarySection from './DashboardMonthlySummarySection';

describe('DashboardMonthlySummarySection', () => {
  it('renders highlights and savings metrics', () => {
    render(<DashboardMonthlySummarySection selectedPeriodLabel="All Time" summary={{ highestIncome: { amount: 500, category: 'Salary' } as never, highestExpense: { amount: 200, category: 'Rent' } as never, totalTransactions: 4, averageExpense: 100, savingsRate: 60 }} />);
    expect(screen.getByText('₹500')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('60.0%')).toBeInTheDocument();
    expect(screen.getByText('In All Time')).toBeInTheDocument();
  });

  it('shows the neutral empty state for zero transactions', () => {
    render(<DashboardMonthlySummarySection selectedPeriodLabel="All Time" summary={{ highestIncome: null, highestExpense: null, totalTransactions: 0, averageExpense: 0, savingsRate: 0 }} />);
    expect(screen.getByText('No monthly summary yet')).toBeInTheDocument();
  });
});