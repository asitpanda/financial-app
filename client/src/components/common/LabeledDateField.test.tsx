import dayjs from 'dayjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LabeledDateField from './LabeledDateField';
import { usePreferencesStore } from '../../store/preferencesStore';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('LabeledDateField', () => {
  beforeEach(() => {
    usePreferencesStore.setState(usePreferencesStore.getInitialState());
  });

  afterEach(() => {
    usePreferencesStore.setState(usePreferencesStore.getInitialState());
  });

  it('renders the selected date and label', () => {
    renderWithProviders(
      <LabeledDateField labelText="Start date" value={dayjs('2026-01-15')} onChange={vi.fn()} />,
    );

    expect(screen.getByText('Start date')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /day/i })).toHaveAttribute('aria-valuenow', '15');
    expect(screen.getByRole('spinbutton', { name: /month/i })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('spinbutton', { name: /year/i })).toHaveAttribute('aria-valuenow', '2026');
  });

  it('renders date validation errors', () => {
    renderWithProviders(
      <LabeledDateField labelText="Start date" value={null} onChange={vi.fn()} errorMessage="Date is required" />,
    );

    expect(screen.getByText('Date is required')).toBeInTheDocument();
    expect(screen.getByRole('group')).toHaveAttribute('aria-invalid', 'true');
  });
});
