export type GoalRecord = {
  id: number;
  userId: number;
  name: string;
  categoryId: number;
  categoryLabelSnapshot: string;
  description: string | null;
  icon: string | null;
  targetAmount: number;
  currentAmount: number;
  startDate: Date;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
