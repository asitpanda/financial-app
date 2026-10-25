import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import KpiCard from './KpiCard';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('KpiCard', () => {
  it('renders the title, value, delta, and icon', () => {
    renderWithProviders(<KpiCard title="Balance" value="₹1,000" delta="+5%" icon={<span aria-label="trend">up</span>} />);

    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('₹1,000')).toBeInTheDocument();
    expect(screen.getByText('+5%')).toBeInTheDocument();
    expect(screen.getByLabelText('trend')).toBeInTheDocument();
  });

  it('handles clicks when the card is interactive', () => {
    const onClick = vi.fn();
    renderWithProviders(<KpiCard title="Balance" value="₹1,000" onClick={onClick} />);

    fireEvent.click(screen.getByText('Balance'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
