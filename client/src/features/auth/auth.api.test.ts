import { beforeEach, describe, expect, it } from 'vitest';
import { authApi } from './auth.api';

const user = { id: 'user-1', email: 'user@example.com', name: 'Test User' };

describe('auth.api logout', () => {
  beforeEach(() => {
    sessionStorage.setItem('token', 'token-123');
    sessionStorage.setItem('user', JSON.stringify(user));
  });

  it('removes persisted credentials without making a request', () => {
    authApi.logout();

    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
  });
});