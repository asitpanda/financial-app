import { describe, expect, it } from 'vitest';
import LabeledTextareaField from './LabeledTextareaField';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('LabeledTextareaField', () => {
  it('renders a multiline field with its value', () => {
    renderWithProviders(
      <LabeledTextareaField labelText="Notes" value="Monthly contribution" onChange={() => undefined} />,
    );

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Monthly contribution');
  });

  it('renders error feedback', () => {
    renderWithProviders(<LabeledTextareaField labelText="Notes" errorMessage="Notes are required" />);

    expect(screen.getByText('Notes are required')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
