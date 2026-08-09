export type CategoryRecord = {
  id: number;
  userId: number;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
};
