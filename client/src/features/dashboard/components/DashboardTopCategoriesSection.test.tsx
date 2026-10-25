import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DashboardTopCategoriesSection from './DashboardTopCategoriesSection';

describe('DashboardTopCategoriesSection', () => {
  it('renders category amounts and percentages', () => {
    render(<DashboardTopCategoriesSection items={[{ name: 'Food', value: 300, color: '#000', percentage: 0.75 }, { name: 'Travel', value: 100, color: '#111', percentage: 0.25 }]} onViewAll={vi.fn()} />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('₹300')).toBeInTheDocument();
    expect(screen.getByText('75.0%')).toBeInTheDocument();
  });

  it('navigates to all categories and supports empty data', async () => {
    const user = userEvent.setup();
    const onViewAll = vi.fn();
    render(<DashboardTopCategoriesSection items={[]} onViewAll={onViewAll} />);
    expect(screen.getByText('No spending data for this period')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View All' }));
    expect(onViewAll).toHaveBeenCalledOnce();
  });
});