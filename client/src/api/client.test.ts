import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios';
import apiClient from './client';
import { authEvents } from './authEvents';

const successAdapter: AxiosAdapter = async (config) => ({
  data: { ok: true },
  status: 200,
  statusText: 'OK',
  headers: new AxiosHeaders(),
  config,
});

const createErrorAdapter = (status: number): AxiosAdapter => async (config) => {
  const response = {
    data: { message: 'Request rejected' },
    status,
    statusText: 'Rejected',
    headers: new AxiosHeaders(),
    config,
  };
  throw new AxiosError('Request rejected', 'ERR_BAD_REQUEST', config, undefined, response);
};

describe('apiClient interceptors', () => {
  beforeEach(() => {
    sessionStorage.clear();
    apiClient.defaults.adapter = successAdapter;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds a bearer token to requests when one is stored', async () => {
    sessionStorage.setItem('token', 'token-123');
    let authorization: unknown;
    apiClient.defaults.adapter = async (config) => {
      authorization = config.headers.Authorization;
      return successAdapter(config);
    };

    await apiClient.get('/accounts');

    expect(authorization).toBe('Bearer token-123');
  });

  it('does not add an authorization header when no token is stored', async () => {
    let authorization: unknown;
    apiClient.defaults.adapter = async (config) => {
      authorization = config.headers.Authorization;
      return successAdapter(config);
    };

    await apiClient.get('/accounts');

    expect(authorization).toBeUndefined();
  });

  it('passes successful responses through unchanged', async () => {
    await expect(apiClient.get('/accounts')).resolves.toMatchObject({
      status: 200,
      data: { ok: true },
    });
  });

  it('clears credentials and emits unauthorized on a 401 response', async () => {
    sessionStorage.setItem('token', 'expired-token');
    sessionStorage.setItem('user', JSON.stringify({ id: 'user-1' }));
    const unauthorized = vi.fn();
    const unsubscribe = authEvents.onUnauthorized(unauthorized);
    apiClient.defaults.adapter = createErrorAdapter(401);

    await expect(apiClient.get('/accounts')).rejects.toBeInstanceOf(AxiosError);

    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
    expect(unauthorized).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('rethrows non-401 errors without clearing credentials or emitting unauthorized', async () => {
    sessionStorage.setItem('token', 'valid-token');
    sessionStorage.setItem('user', JSON.stringify({ id: 'user-1' }));
    const unauthorized = vi.fn();
    const unsubscribe = authEvents.onUnauthorized(unauthorized);
    apiClient.defaults.adapter = createErrorAdapter(500);

    await expect(apiClient.get('/accounts')).rejects.toMatchObject({ response: { status: 500 } });

    expect(sessionStorage.getItem('token')).toBe('valid-token');
    expect(sessionStorage.getItem('user')).toBe(JSON.stringify({ id: 'user-1' }));
    expect(unauthorized).not.toHaveBeenCalled();
    unsubscribe();
  });
});