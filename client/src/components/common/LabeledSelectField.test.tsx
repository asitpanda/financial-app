import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LabeledSelectField from './LabeledSelectField';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('LabeledSelectField', () => {
  it('renders options when opened', () => {
    renderWithProviders(
      <LabeledSelectField
        labelText="Status"
        value="active"
        options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }]}
        onChange={() => undefined}
      />,
    );

    fireEvent.mouseDown(screen.getByRole('combobox'));

    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Paused' })).toBeInTheDocument();
  });

  it('renders validation feedback', () => {
    renderWithProviders(
      <LabeledSelectField labelText="Status" value="" options={[]} errorMessage="Status is required" onChange={() => undefined} />,
    );

    expect(screen.getByText('Status is required')).toBeInTheDocument();
  });
});
