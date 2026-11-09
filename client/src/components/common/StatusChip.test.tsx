import { describe, expect, it } from 'vitest';
import StatusChip from './StatusChip';
import { renderWithProviders, screen } from '../../test/test-utils';
import { CHIP_COLORS } from '../../colors';

describe('StatusChip', () => {
  it('renders the status label', () => {
    renderWithProviders(<StatusChip label="active" tone="success" />);

    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('active')).toHaveClass('MuiChip-label');
  });

  it.each(['light', 'dark'] as const)('uses %s theme colors for movement statuses', (themeMode) => {
    const chipColors = CHIP_COLORS[themeMode];
    renderWithProviders(
      <>
        <StatusChip label="Transfer" tone="transfer" />
        <StatusChip label="Investment" tone="investment" />
      </>,
      { themeMode },
    );

    expect(screen.getByText('Transfer').parentElement).toHaveStyle({
      backgroundColor: chipColors.transfer.backgroundColor,
      color: chipColors.transfer.color,
      borderColor: chipColors.transfer.color,
    });
    expect(screen.getByText('Investment').parentElement).toHaveStyle({
      backgroundColor: chipColors.investment.backgroundColor,
      color: chipColors.investment.color,
      borderColor: chipColors.investment.color,
    });
  });
});
