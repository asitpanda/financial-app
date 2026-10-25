import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import AuthLoginForm from './AuthLoginForm';
import { renderWithProviders, screen } from '../../../test/test-utils';

describe('AuthLoginForm', () => {
  it('shows validation errors and does not submit empty credentials', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<AuthLoginForm loading={false} apiErrors={[]} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Email, user ID, or mobile is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid credentials and displays API errors', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(
      <AuthLoginForm loading={false} apiErrors={['Invalid credentials', 'Account is locked']} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByLabelText('Email, User ID, or Mobile'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(onSubmit.mock.calls[0][0]).toEqual({ identifier: 'user@example.com', password: 'password' });
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByText('Account is locked')).toBeInTheDocument();
  });

  it('disables submission and shows progress while loading', () => {
    renderWithProviders(<AuthLoginForm loading apiErrors={[]} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
