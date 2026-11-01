import { beforeEach, describe, expect, it } from 'vitest';
import { authEvents } from '../../api/authEvents';
import { useAppStore } from '../../store/appStore';
import { useAuth } from './useAuth';
import { usePreferencesStore } from '../../store/preferencesStore';

const user = { id: 'user-1', email: 'user@example.com', name: 'Test User' };

describe('useAuth', () => {
  beforeEach(() => {
    sessionStorage.clear();
    usePreferencesStore.setState({ preferences: null, sessionId: 0 });
    useAppStore.setState({ activeScreen: 'dashboard' });
    useAuth.setState({ user: null, token: null, isAuthenticated: false, loading: false, logoutReason: null });
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

  it('records idle logout and resets the reason on a new login', () => {
    useAuth.getState().setCredentials({ user, token: 'token-123' });
    useAuth.getState().logout('idle');
    expect(useAuth.getState().logoutReason).toBe('idle');
    useAuth.getState().setCredentials({ user, token: 'new-token' });
    expect(useAuth.getState().logoutReason).toBeNull();
  });

  it('can dismiss the inactivity reason and does not retain it after manual logout', () => {
    useAuth.getState().logout('idle');
    useAuth.getState().clearLogoutReason();
    expect(useAuth.getState().logoutReason).toBeNull();
    useAuth.getState().logout('idle');
    useAuth.getState().logout();
    expect(useAuth.getState().logoutReason).toBeNull();
  });

  it('hydrates preferences on login and clears them along with loading on logout', () => {
    useAuth.getState().setCredentials({ user, token: 'token-123', preferences: { currencyDisplay: 'code' } });
    expect(usePreferencesStore.getState().preferences).toEqual({ currencyDisplay: 'code' });
    useAuth.getState().setLoading(true);
    useAuth.getState().logout();
    expect(usePreferencesStore.getState().preferences).toBeNull();
    expect(useAuth.getState().loading).toBe(false);
  });
});