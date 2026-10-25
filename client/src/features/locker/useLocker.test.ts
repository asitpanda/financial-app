import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import lockerApi from './locker.api';
import {
  lockerKeys,
  useCreateLockerEntity,
  useCreateLockerRecord,
  useDeleteLockerEntity,
  useDeleteLockerRecord,
  useLockerEntities,
  useLockerRecords,
  useUpdateLockerEntity,
  useUpdateLockerRecord,
} from './useLocker';

vi.mock('./locker.api', () => ({
  default: {
    getEntities: vi.fn(),
    getRecords: vi.fn(),
    createEntity: vi.fn(),
    updateEntity: vi.fn(),
    deleteEntity: vi.fn(),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  },
}));

const createWrapper = (queryClient: QueryClient) => ({ children }: { children: ReactNode }) => (
  React.createElement(QueryClientProvider, { client: queryClient }, children)
);

afterEach(() => vi.clearAllMocks());

describe('lockerKeys', () => {
  it('builds stable entity and record query keys', () => {
    expect(lockerKeys.entities()).toEqual(['locker', 'entities']);
    expect(lockerKeys.records()).toEqual(['locker', 'records', 'all']);
    expect(lockerKeys.records('entity-1')).toEqual(['locker', 'records', 'entity-1']);
  });
});

describe('useLockerEntities', () => {
  it('loads entities from the API', async () => {
    vi.mocked(lockerApi.getEntities).mockResolvedValue([{ uid: 'entity-1' }] as never);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const entities = renderHook(() => useLockerEntities(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(entities.result.current.data).toEqual([{ uid: 'entity-1' }]));
    expect(lockerApi.getEntities).toHaveBeenCalledOnce();
  });
});

describe('useLockerRecords', () => {
  it('loads records for an entity', async () => {
    vi.mocked(lockerApi.getRecords).mockResolvedValue([{ uid: 'record-1' }] as never);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const records = renderHook(() => useLockerRecords('entity-1'), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(records.result.current.data).toEqual([{ uid: 'record-1' }]));
    expect(lockerApi.getRecords).toHaveBeenCalledWith('entity-1');
  });
});

describe('useCreateLockerEntity', () => {
  it('invalidates all locker queries after creating an entity', async () => {
    vi.mocked(lockerApi.createEntity).mockResolvedValue({ uid: 'entity-1' } as never);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateLockerEntity(), { wrapper: createWrapper(queryClient) });

    await result.current.mutateAsync({ label: 'Bank', fields: [] });

    expect(lockerApi.createEntity).toHaveBeenCalledWith({ label: 'Bank', fields: [] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['locker'] });
  });
});

describe('useUpdateLockerRecord', () => {
  it('updates a record and invalidates locker data', async () => {
    vi.mocked(lockerApi.updateRecord).mockResolvedValue({ uid: 'record-1' } as never);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateLockerRecord(), { wrapper: createWrapper(queryClient) });
    const data = { label: 'Updated', values: { password: 'secret' } };

    await result.current.mutateAsync({ uid: 'record-1', data });

    expect(lockerApi.updateRecord).toHaveBeenCalledWith('record-1', data);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['locker'] });
  });
});

describe('useUpdateLockerEntity', () => {
  it('updates an entity and invalidates locker data', async () => {
    vi.mocked(lockerApi.updateEntity).mockResolvedValue({ uid: 'entity-1' } as never);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateLockerEntity(), { wrapper: createWrapper(queryClient) });

    await result.current.mutateAsync({ uid: 'entity-1', data: { label: 'Updated' } });

    expect(lockerApi.updateEntity).toHaveBeenCalledWith('entity-1', { label: 'Updated' });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['locker'] });
  });
});

describe('useDeleteLockerEntity', () => {
  it('deletes an entity and invalidates locker data', async () => {
    vi.mocked(lockerApi.deleteEntity).mockResolvedValue(undefined);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteLockerEntity(), { wrapper: createWrapper(queryClient) });

    await result.current.mutateAsync('entity-1');

    expect(lockerApi.deleteEntity).toHaveBeenCalledWith('entity-1');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['locker'] });
  });
});

describe('useCreateLockerRecord', () => {
  it('creates a record and invalidates locker data', async () => {
    vi.mocked(lockerApi.createRecord).mockResolvedValue({ uid: 'record-1' } as never);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateLockerRecord(), { wrapper: createWrapper(queryClient) });
    const data = { entityUid: 'entity-1', label: 'Primary', values: { account: '123' } };

    await result.current.mutateAsync(data);

    expect(lockerApi.createRecord).toHaveBeenCalledWith(data);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['locker'] });
  });
});

describe('useDeleteLockerRecord', () => {
  it('deletes a record and invalidates locker data', async () => {
    vi.mocked(lockerApi.deleteRecord).mockResolvedValue(undefined);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteLockerRecord(), { wrapper: createWrapper(queryClient) });

    await result.current.mutateAsync('record-1');

    expect(lockerApi.deleteRecord).toHaveBeenCalledWith('record-1');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['locker'] });
  });
});
