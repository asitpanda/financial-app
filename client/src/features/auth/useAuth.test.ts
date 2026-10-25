import { beforeEach, describe, expect, it } from 'vitest';
import { authEvents } from '../../api/authEvents';
import { useAppStore } from '../../store/appStore';
import { useAuth } from './useAuth';

const user = { id: 'user-1', email: 'user@example.com', name: 'Test User' };

describe('useAuth', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAppStore.setState({ activeScreen: 'dashboard' });
    useAuth.setState({ user: null, token: null, isAuthenticated: false, loading: false });
  });

  it('stores credentials and marks the user authenticated', () => {
    useAuth.getState().setCredentials({ user, token: 'token-123' });

    expect(useAuth.getState()).toMatchObject({ user, token: 'token-123', isAuthenticated: true });
    expect(sessionStorage.getItem('token')).toBe('token-123');
    expect(sessionStorage.getItem('user')).toBe(JSON.stringify(user));
  });

  it('updates the current user while preserving the token', () => {
    useAuth.getState().setCredentials({ user, token: 'token-123' });
    const updatedUser = { ...user, name: 'Updated User' };

    useAuth.getState().setUser(updatedUser);

    expect(useAuth.getState()).toMatchObject({ user: updatedUser, token: 'token-123', isAuthenticated: true });
    expect(sessionStorage.getItem('user')).toBe(JSON.stringify(updatedUser));
  });

  it('updates loading without changing authentication state', () => {
    useAuth.getState().setLoading(true);

    expect(useAuth.getState()).toMatchObject({ loading: true, isAuthenticated: false });
  });

  it('logs out, clears storage, and resets the active screen', () => {
    useAuth.getState().setCredentials({ user, token: 'token-123' });
    useAppStore.getState().navigateTo('transactions');

    useAuth.getState().logout();

    expect(useAuth.getState()).toMatchObject({ user: null, token: null, isAuthenticated: false });
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
    expect(useAppStore.getState().activeScreen).toBe('dashboard');
  });

  it('logs out in memory when an unauthorized event is emitted', () => {
    useAuth.getState().setCredentials({ user, token: 'token-123' });
    useAppStore.getState().navigateTo('transactions');

    authEvents.emitUnauthorized();

    expect(useAuth.getState().isAuthenticated).toBe(false);
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(useAppStore.getState().activeScreen).toBe('dashboard');
  });
});