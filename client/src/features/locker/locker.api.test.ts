import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import lockerApi from './locker.api';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

beforeEach(() => vi.clearAllMocks());

describe('lockerApi.getEntities', () => {
  it('requests entities and returns the response data', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ uid: 'entity-1' }] });

    await expect(lockerApi.getEntities()).resolves.toEqual([{ uid: 'entity-1' }]);
    expect(apiClient.get).toHaveBeenCalledWith('/locker/entities');
  });
});

describe('lockerApi.createEntity', () => {
  it('posts an entity and returns the response data', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { uid: 'entity-2' } });

    await expect(lockerApi.createEntity({ label: 'Bank', fields: [] })).resolves.toEqual({ uid: 'entity-2' });
    expect(apiClient.post).toHaveBeenCalledWith('/locker/entities', { label: 'Bank', fields: [] });
  });
});

describe('lockerApi.updateEntity', () => {
  it('patches an entity and returns the response data', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { uid: 'entity-1' } });

    await expect(lockerApi.updateEntity('entity-1', { label: 'Updated' })).resolves.toEqual({ uid: 'entity-1' });
    expect(apiClient.patch).toHaveBeenCalledWith('/locker/entities/entity-1', { label: 'Updated' });
  });
});

describe('lockerApi.deleteEntity', () => {
  it('deletes an entity by uid', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({});

    await expect(lockerApi.deleteEntity('entity-1')).resolves.toBeUndefined();
    expect(apiClient.delete).toHaveBeenCalledWith('/locker/entities/entity-1');
  });
});

describe('lockerApi.getRecords', () => {
  it('gets records with and without an entity filter', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    await lockerApi.getRecords();
    await lockerApi.getRecords('entity-1');

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/locker/records', { params: undefined });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/locker/records', { params: { entityUid: 'entity-1' } });
  });
});

describe('lockerApi.createRecord', () => {
  it('performs record mutations with the expected routes and payloads', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { uid: 'record-1' } });
    const payload = { entityUid: 'entity-1', label: 'Primary', values: { account: '123' } };

    await expect(lockerApi.createRecord(payload)).resolves.toEqual({ uid: 'record-1' });
    expect(apiClient.post).toHaveBeenCalledWith('/locker/records', payload);
  });
});

describe('lockerApi.updateRecord', () => {
  it('patches a record and returns the response data', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { uid: 'record-1' } });

    await expect(lockerApi.updateRecord('record-1', { label: 'Updated' })).resolves.toEqual({ uid: 'record-1' });
    expect(apiClient.patch).toHaveBeenCalledWith('/locker/records/record-1', { label: 'Updated' });
  });
});

describe('lockerApi.deleteRecord', () => {
  it('deletes a record by uid', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({});

    await expect(lockerApi.deleteRecord('record-1')).resolves.toBeUndefined();
    expect(apiClient.delete).toHaveBeenCalledWith('/locker/records/record-1');
  });
});
