import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LabeledAutocompleteField from './LabeledAutocompleteField';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('LabeledAutocompleteField', () => {
  it('opens and displays available options', () => {
    renderWithProviders(
      <LabeledAutocompleteField labelText="Account" options={['Checking', 'Savings']} />,
    );

    fireEvent.mouseDown(screen.getByRole('combobox'));

    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
  });

  it('renders helper and error text', () => {
    renderWithProviders(
      <LabeledAutocompleteField labelText="Account" options={[]} errorMessage="Choose an account" />,
    );

    expect(screen.getByText('Choose an account')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });
});
