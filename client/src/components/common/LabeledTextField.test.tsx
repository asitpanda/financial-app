import { describe, expect, it } from 'vitest';
import LabeledTextField from './LabeledTextField';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('LabeledTextField', () => {
  it('renders a labeled input with its value', () => {
    renderWithProviders(<LabeledTextField labelText="Institution" value="Acme Bank" onChange={() => undefined} />);

    expect(screen.getByText('Institution')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Acme Bank');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Institution');
  });

  it('renders error feedback', () => {
    renderWithProviders(<LabeledTextField labelText="Institution" errorMessage="Institution is required" />);

    expect(screen.getByText('Institution is required')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
