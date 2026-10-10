import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import lockerApi from './locker.api';
import type {
  CreateLockerEntityInput,
  CreateLockerRecordInput,
  UpdateLockerEntityInput,
  UpdateLockerRecordInput,
} from './locker.types';

export const lockerKeys = {
  all: ['locker'] as const,
  entities: () => ['locker', 'entities'] as const,
  records: (entityUid?: string) => ['locker', 'records', entityUid || 'all'] as const,
};

export const useLockerEntities = () =>
  useQuery({
    queryKey: lockerKeys.entities(),
    queryFn: lockerApi.getEntities,
  });

export const useLockerRecords = (entityUid?: string) =>
  useQuery({
    queryKey: lockerKeys.records(entityUid),
    queryFn: () => lockerApi.getRecords(entityUid),
  });

const invalidateLocker = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: lockerKeys.all });
};

export const useCreateLockerEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLockerEntityInput) => lockerApi.createEntity(data),
    onSuccess: () => invalidateLocker(queryClient),
  });
};

export const useUpdateLockerEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: UpdateLockerEntityInput }) => lockerApi.updateEntity(uid, data),
    onSuccess: () => invalidateLocker(queryClient),
  });
};

export const useDeleteLockerEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => lockerApi.deleteEntity(uid),
    onSuccess: () => invalidateLocker(queryClient),
  });
};

export const useCreateLockerRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLockerRecordInput) => lockerApi.createRecord(data),
    onSuccess: () => invalidateLocker(queryClient),
  });
};

export const useUpdateLockerRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: UpdateLockerRecordInput }) => lockerApi.updateRecord(uid, data),
    onSuccess: () => invalidateLocker(queryClient),
  });
};

export const useDeleteLockerRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => lockerApi.deleteRecord(uid),
    onSuccess: () => invalidateLocker(queryClient),
  });
};