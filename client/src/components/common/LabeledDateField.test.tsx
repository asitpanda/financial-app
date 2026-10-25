import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';
import LabeledDateField from './LabeledDateField';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('LabeledDateField', () => {
  it('renders the selected date and label', () => {
    renderWithProviders(
      <LabeledDateField labelText="Start date" value={dayjs('2026-01-15')} onChange={vi.fn()} />,
    );

    expect(screen.getByText('Start date')).toBeInTheDocument();
    expect(screen.getByRole('group')).toHaveTextContent('01/15/2026');
  });

  it('renders date validation errors', () => {
    renderWithProviders(
      <LabeledDateField labelText="Start date" value={null} onChange={vi.fn()} errorMessage="Date is required" />,
    );

    expect(screen.getByText('Date is required')).toBeInTheDocument();
    expect(screen.getByRole('group')).toHaveAttribute('aria-invalid', 'true');
  });
});
