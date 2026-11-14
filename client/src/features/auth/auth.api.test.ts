import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import { authApi } from './auth.api';

const user = { id: 'user-1', email: 'user@example.com', name: 'Test User' };
const authResponse = { user, token: 'token-123' };

describe('authApi', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('token', 'token-123');
    sessionStorage.setItem('user', JSON.stringify(user));
  });

  afterEach(() => vi.restoreAllMocks());

  describe('register', () => {
    it('posts registration details and returns the authentication response', async () => {
      const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: authResponse } as never);
      const data = { email: 'user@example.com', password: 'password' };

      await expect(authApi.register(data)).resolves.toEqual(authResponse);
      expect(post).toHaveBeenCalledWith('/auth/register', data);
    });
  });

  describe('login', () => {
    it('posts login credentials and returns the authentication response', async () => {
      const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: authResponse } as never);
      const data = { identifier: 'user@example.com', password: 'password' };

      await expect(authApi.login(data)).resolves.toEqual(authResponse);
      expect(post).toHaveBeenCalledWith('/auth/login', data);
    });
  });

  describe('getMe', () => {
    it('requests the current user with the stored token and abort signal', async () => {
      const currentUser = { ...user, preferences: { currencyDisplay: 'code' as const } };
      const controller = new AbortController();
      const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: currentUser } as never);

      await expect(authApi.getMe(controller.signal)).resolves.toEqual(currentUser);
      expect(get).toHaveBeenCalledWith('/auth/me', {
        signal: controller.signal,
        headers: { Authorization: 'Bearer token-123' },
      });
    });
  });

  describe('logout', () => {
    it('removes persisted credentials', () => {
      authApi.logout();

      expect(sessionStorage.getItem('token')).toBeNull();
      expect(sessionStorage.getItem('user')).toBeNull();
    });
  });
});