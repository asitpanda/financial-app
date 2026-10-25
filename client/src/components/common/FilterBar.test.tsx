import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FilterBar from './FilterBar';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('FilterBar', () => {
  it('renders filter content and reset action when provided', () => {
    const onReset = vi.fn();
    renderWithProviders(
      <FilterBar onReset={onReset}>
        <label htmlFor="status">Status</label>
        <select id="status"><option>All</option></select>
      </FilterBar>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset Filters' }));

    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('does not render a reset action without a reset handler', () => {
    renderWithProviders(<FilterBar><span>Filters</span></FilterBar>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
