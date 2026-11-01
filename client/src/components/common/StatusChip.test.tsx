import { describe, expect, it } from 'vitest';
import StatusChip from './StatusChip';
import { renderWithProviders, screen } from '../../test/test-utils';
import { createAppTheme } from '../../theme/createAppTheme';

describe('StatusChip', () => {
  it('renders the status label', () => {
    renderWithProviders(<StatusChip label="active" tone="success" />);

    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('active')).toHaveClass('MuiChip-label');
  });

  it.each(['light', 'dark'] as const)('uses %s theme colors for movement statuses', (themeMode) => {
    const theme = createAppTheme(themeMode);
    renderWithProviders(
      <>
        <StatusChip label="Transfer" tone="transfer" />
        <StatusChip label="Investment" tone="investment" />
      </>,
      { themeMode },
    );

    expect(screen.getByText('Transfer').parentElement).toHaveStyle({
      color: theme.palette.movement.transfer,
      borderColor: theme.palette.movement.transfer,
    });
    expect(screen.getByText('Investment').parentElement).toHaveStyle({
      color: theme.palette.movement.investment,
      borderColor: theme.palette.movement.investment,
    });
  });
});
