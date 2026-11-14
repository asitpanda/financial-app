import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authEvents } from '../../api/authEvents';
import { useAppStore } from '../../store/appStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import { authApi } from './auth.api';
import { useAuth, useGetMe, useLogin, useLogout, useRegister } from './useAuth';

const user = { id: 'user-1', email: 'user@example.com', name: 'Test User' };

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useAuth', () => {
  beforeEach(() => {
    sessionStorage.clear();
    usePreferencesStore.setState({ preferences: null, sessionId: 0 });
    useAppStore.setState({ activeScreen: 'dashboard' });
    useAuth.setState({ user: null, token: null, isAuthenticated: false, loading: false, logoutReason: null });
  });

  afterEach(() => vi.restoreAllMocks());

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

  describe('useLogin', () => {
    it('stores returned credentials after successful login', async () => {
      const login = vi.spyOn(authApi, 'login').mockResolvedValue({ user, token: 'token-123' });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      const credentials = { identifier: 'user@example.com', password: 'password' };

      await act(async () => {
        await result.current.mutateAsync(credentials);
      });

      expect(login).toHaveBeenCalledWith(credentials);
      await waitFor(() => {
        expect(useAuth.getState()).toMatchObject({ user, token: 'token-123', isAuthenticated: true });
      });
    });
  });

  describe('useRegister', () => {
    it('stores returned credentials after successful registration', async () => {
      const register = vi.spyOn(authApi, 'register').mockResolvedValue({ user, token: 'token-123' });
      const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });
      const credentials = { email: 'user@example.com', password: 'password' };

      await act(async () => {
        await result.current.mutateAsync(credentials);
      });

      expect(register).toHaveBeenCalledWith(credentials);
      await waitFor(() => {
        expect(useAuth.getState()).toMatchObject({ user, token: 'token-123', isAuthenticated: true });
      });
    });
  });

  describe('useGetMe', () => {
    it('loads the current user and preferences for an authenticated session', async () => {
      const currentUser = { ...user, preferences: { currencyDisplay: 'code' as const } };
      const getMe = vi.spyOn(authApi, 'getMe').mockResolvedValue(currentUser);
      useAuth.setState({ user: null, token: 'token-123', isAuthenticated: true, loading: false, logoutReason: null });

      const { result } = renderHook(() => useGetMe(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await waitFor(() => expect(useAuth.getState().user).toEqual(user));
      expect(getMe).toHaveBeenCalledOnce();
      expect(usePreferencesStore.getState().preferences).toEqual({ currencyDisplay: 'code' });
    });

    it('does not request the current user when no token is present', () => {
      const getMe = vi.spyOn(authApi, 'getMe');

      const { result } = renderHook(() => useGetMe(), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(getMe).not.toHaveBeenCalled();
    });
  });

  describe('useLogout', () => {
    it('clears persisted and in-memory credentials when invoked', () => {
      useAuth.getState().setCredentials({ user, token: 'token-123' });
      useAppStore.getState().navigateTo('transactions');
      const logoutApi = vi.spyOn(authApi, 'logout');
      const { result } = renderHook(() => useLogout());

      act(() => result.current());

      expect(logoutApi).toHaveBeenCalledOnce();
      expect(useAuth.getState()).toMatchObject({ user: null, token: null, isAuthenticated: false });
      expect(sessionStorage.getItem('token')).toBeNull();
      expect(useAppStore.getState().activeScreen).toBe('dashboard');
    });
  });
});