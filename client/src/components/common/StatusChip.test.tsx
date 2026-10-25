import { describe, expect, it } from 'vitest';
import StatusChip from './StatusChip';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('StatusChip', () => {
  it('renders the status label', () => {
    renderWithProviders(<StatusChip label="active" tone="success" />);

    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('active')).toHaveClass('MuiChip-label');
  });

  it('supports a custom color without changing the label', () => {
    renderWithProviders(<StatusChip label="review" hexColor="#123456" />);

    expect(screen.getByText('review')).toBeInTheDocument();
    expect(screen.getByText('review').parentElement).toHaveStyle({ color: '#123456' });
  });
});
