import { act, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from '../../../constants/appConstants';
import { renderWithProviders, screen } from '../../../test/test-utils';
import { useAuth } from '../useAuth';
import IdleTimeoutGuard from './IdleTimeoutGuard';

describe('IdleTimeoutGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    useAuth.setState({ user: null, token: null, isAuthenticated: false, logoutReason: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const signIn = () => useAuth.getState().setCredentials({
    user: { id: 'user-1', email: 'user@example.com', name: 'Test User' }, token: 'token-123',
  });

  it('does not start an idle session while unauthenticated', () => {
    renderWithProviders(<IdleTimeoutGuard />);
    act(() => vi.advanceTimersByTime(IDLE_TIMEOUT_MS));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(useAuth.getState().logoutReason).toBeNull();
  });

  it('uses the app policy to warn at 29 minutes and clear credentials at 30 minutes', () => {
    signIn();
    renderWithProviders(<IdleTimeoutGuard />);
    act(() => vi.advanceTimersByTime(IDLE_TIMEOUT_MS - IDLE_WARNING_MS));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(screen.getByText('Signing out in 60 seconds', { selector: '[aria-hidden="true"]' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Signing out in 60 seconds');
    act(() => vi.advanceTimersByTime(IDLE_WARNING_MS));
    expect(useAuth.getState()).toMatchObject({ isAuthenticated: false, logoutReason: 'idle' });
    expect(sessionStorage.getItem('token')).toBeNull();
  });

  it('keeps the session on explicit continuation but supports immediate manual logout', () => {
    signIn();
    renderWithProviders(<IdleTimeoutGuard />);
    act(() => vi.advanceTimersByTime(IDLE_TIMEOUT_MS - IDLE_WARNING_MS));
    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    act(() => vi.advanceTimersByTime(IDLE_TIMEOUT_MS - IDLE_WARNING_MS));
    expect(useAuth.getState().isAuthenticated).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out now' }));
    expect(useAuth.getState()).toMatchObject({ isAuthenticated: false, logoutReason: null });
  });
});