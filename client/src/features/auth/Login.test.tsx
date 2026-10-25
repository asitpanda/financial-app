import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { useAuth } from './useAuth';
import { authApi } from './auth.api';
import Login from './Login';

const user = { id: 'user-1', email: 'user@example.com', name: 'Test User' };

describe('Login', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuth.setState({ user: null, token: null, isAuthenticated: false, loading: false });
  });

  it('shows validation errors when login is submitted empty', async () => {
    const userEventInstance = userEvent.setup();
    const login = vi.spyOn(authApi, 'login');
    renderWithProviders(<Login />);

    await userEventInstance.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Email, user ID, or mobile is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('submits valid credentials and stores the returned credentials', async () => {
    const userEventInstance = userEvent.setup();
    const login = vi.spyOn(authApi, 'login').mockResolvedValue({ user, token: 'token-123' });
    renderWithProviders(<Login />);

    await userEventInstance.type(screen.getByLabelText('Email, User ID, or Mobile'), 'user@example.com');
    await userEventInstance.type(screen.getByLabelText('Password'), 'password');
    await userEventInstance.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(login).toHaveBeenCalledWith({ identifier: 'user@example.com', password: 'password' }));
    expect(useAuth.getState()).toMatchObject({ user, token: 'token-123', isAuthenticated: true });
  });

  it('renders API validation messages when login fails', async () => {
    const userEventInstance = userEvent.setup();
    vi.spyOn(authApi, 'login').mockRejectedValue({
      response: { data: { message: ['Invalid credentials', 'Account is locked'] } },
    });
    renderWithProviders(<Login />);

    await userEventInstance.type(screen.getByLabelText('Email, User ID, or Mobile'), 'user@example.com');
    await userEventInstance.type(screen.getByLabelText('Password'), 'password');
    await userEventInstance.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByText('Account is locked')).toBeInTheDocument();
    expect(useAuth.getState().isAuthenticated).toBe(false);
  });

  it('switches to registration and validates required registration fields', async () => {
    const userEventInstance = userEvent.setup();
    renderWithProviders(<Login />);

    await userEventInstance.click(screen.getByRole('tab', { name: 'Register' }));
    await userEventInstance.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toBeVisible();
  });
});