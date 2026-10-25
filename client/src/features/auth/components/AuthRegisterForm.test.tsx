import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import AuthRegisterForm from './AuthRegisterForm';
import { renderWithProviders, screen } from '../../../test/test-utils';

describe('AuthRegisterForm', () => {
  it('shows required validation errors and does not submit invalid values', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<AuthRegisterForm loading={false} apiErrors={[]} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits registration values and displays API errors', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(
      <AuthRegisterForm loading={false} apiErrors={['Email already exists']} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByLabelText('Name'), 'Test User');
    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('User ID (Optional)'), 'testuser');
    await user.type(screen.getByLabelText('Mobile (Optional)'), '+1234567890');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Test User',
      email: 'user@example.com',
      userId: 'testuser',
      mobile: '+1234567890',
      password: 'password',
    });
    expect(screen.getByText('Email already exists')).toBeInTheDocument();
  });

  it('disables submission and shows progress while loading', () => {
    renderWithProviders(<AuthRegisterForm loading apiErrors={[]} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
