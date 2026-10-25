import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppButton from './AppButton';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('AppButton', () => {
  it('renders its content and forwards click events', () => {
    const onClick = vi.fn();
    renderWithProviders(<AppButton onClick={onClick}>Save</AppButton>);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('preserves the disabled state', () => {
    renderWithProviders(<AppButton disabled>Save</AppButton>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
