import { describe, expect, it } from 'vitest';
import ProgressBar from './ProgressBar';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('ProgressBar', () => {
  it('renders the label and percentage', () => {
    renderWithProviders(<ProgressBar value={42.4} label="Goal progress" />);

    expect(screen.getByText('Goal progress')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42.4');
  });

  it('clamps values outside the valid percentage range', () => {
    const { rerender } = renderWithProviders(<ProgressBar value={-20} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    rerender(<ProgressBar value={120} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
