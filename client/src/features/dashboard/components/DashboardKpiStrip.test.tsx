import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardKpiStrip from './DashboardKpiStrip';

describe('DashboardKpiStrip', () => {
  it('renders balance, portfolio, investment, and return values', () => {
    render(<DashboardKpiStrip balance={1250} investmentSummary={{ periodCurrentValue: 1200, periodTotalInvested: 1000, periodUnrealisedGain: 200, periodUnrealisedGainPct: 20 }} />);
    expect(screen.getByText('₹1,250')).toBeInTheDocument();
    expect(screen.getByText('₹1,200')).toBeInTheDocument();
    expect(screen.getByText('₹1,000')).toBeInTheDocument();
    expect(screen.getByText('₹200 (+20.0%)')).toBeInTheDocument();
  });
});