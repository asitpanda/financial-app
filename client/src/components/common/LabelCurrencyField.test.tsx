import { describe, expect, it } from 'vitest';
import LabelCurrencyField from './LabelCurrencyField';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('LabelCurrencyField', () => {
  it('renders the currency prefix and formatted value', () => {
    renderWithProviders(<LabelCurrencyField labelText="Amount" value="1234.5" />);

    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('₹ 1,234.5');
  });

  it('renders an error message and exposes the error state', () => {
    renderWithProviders(<LabelCurrencyField labelText="Amount" value="0" errorMessage="Amount is required" />);

    expect(screen.getByText('Amount is required')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
