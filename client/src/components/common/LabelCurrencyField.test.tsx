import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import LabelCurrencyField from './LabelCurrencyField';
import { renderWithProviders, screen, userEvent } from '../../test/test-utils';
import { usePreferencesStore } from '../../store/preferencesStore';

describe('LabelCurrencyField', () => {
  beforeEach(() => { usePreferencesStore.getState().beginSession({ currencyDisplay: 'symbol' }); });
  afterEach(() => { usePreferencesStore.getState().beginSession(); });

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

  it('uses the saved display and record currency while emitting unformatted numeric values', async () => {
    usePreferencesStore.getState().beginSession({ currencyDisplay: 'code' });
    const onValueChange = vi.fn();
    function CurrencyInput() {
      const [amount, setAmount] = useState('');
      return <LabelCurrencyField labelText="Amount" currencyCode="USD" value={amount}
        onValueChange={(value) => { setAmount(value); onValueChange(value); }} />;
    }
    renderWithProviders(<CurrencyInput />);

    await userEvent.type(screen.getByRole('textbox'), '25');

    expect(screen.getByRole('textbox')).toHaveValue('USD 25');
    expect(onValueChange).toHaveBeenLastCalledWith('25');
  });
});
