export type LockerFieldType = 'text' | 'password' | 'number' | 'select' | 'date';

export interface LockerFieldOption {
  uid: string;
  label: string;
  value: string;
}

export interface LockerField {
  uid: string;
  label: string;
  type: LockerFieldType;
  masked: boolean;
  options?: LockerFieldOption[];
}

export interface LockerEntity {
  uid: string;
  userId: number;
  label: string;
  fields: LockerField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LockerRecord {
  uid: string;
  entityUid: string;
  label: string;
  values: Record<string, string | null>;
  createdAt?: string;
  updatedAt?: string;
}

export interface LockerFieldOptionInput {
  uid?: string;
  label: string;
  value: string;
}

export interface LockerFieldInput {
  uid?: string;
  label: string;
  type: LockerFieldType;
  masked: boolean;
  options?: LockerFieldOptionInput[];
}

export interface CreateLockerEntityInput {
  label: string;
  fields: LockerFieldInput[];
}

export type UpdateLockerEntityInput = Partial<CreateLockerEntityInput>;

export interface CreateLockerRecordInput {
  entityUid: string;
  label: string;
  values: Record<string, string | null>;
}

export type UpdateLockerRecordInput = Partial<Pick<CreateLockerRecordInput, 'label' | 'values'>>;