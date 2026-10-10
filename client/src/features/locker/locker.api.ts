import apiClient from '../../api/client';
import type {
  CreateLockerEntityInput,
  CreateLockerRecordInput,
  LockerEntity,
  LockerRecord,
  UpdateLockerEntityInput,
  UpdateLockerRecordInput,
} from './locker.types';

const lockerApi = {
  getEntities: async (): Promise<LockerEntity[]> => {
    const response = await apiClient.get('/locker/entities');
    return response.data;
  },

  createEntity: async (data: CreateLockerEntityInput): Promise<LockerEntity> => {
    const response = await apiClient.post('/locker/entities', data);
    return response.data;
  },

  updateEntity: async (uid: string, data: UpdateLockerEntityInput): Promise<LockerEntity> => {
    const response = await apiClient.patch(`/locker/entities/${uid}`, data);
    return response.data;
  },

  deleteEntity: async (uid: string): Promise<void> => {
    await apiClient.delete(`/locker/entities/${uid}`);
  },

  getRecords: async (entityUid?: string): Promise<LockerRecord[]> => {
    const response = await apiClient.get('/locker/records', {
      params: entityUid ? { entityUid } : undefined,
    });
    return response.data;
  },

  createRecord: async (data: CreateLockerRecordInput): Promise<LockerRecord> => {
    const response = await apiClient.post('/locker/records', data);
    return response.data;
  },

  updateRecord: async (uid: string, data: UpdateLockerRecordInput): Promise<LockerRecord> => {
    const response = await apiClient.patch(`/locker/records/${uid}`, data);
    return response.data;
  },

  deleteRecord: async (uid: string): Promise<void> => {
    await apiClient.delete(`/locker/records/${uid}`);
  },
};

export default lockerApi;