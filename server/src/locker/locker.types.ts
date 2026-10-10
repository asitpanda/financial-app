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
  createdAt: Date;
  updatedAt: Date;
}

export interface LockerRecord {
  uid: string;
  entityUid: string;
  label: string;
  values: Record<string, string | null>;
  createdAt: Date;
  updatedAt: Date;
}
