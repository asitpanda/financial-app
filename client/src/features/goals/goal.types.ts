export interface Goal {
  id: string;
  name: string;
  category?: string;
  categoryId?: string | null;
  categoryLabelSnapshot?: string;
  description?: string;
  icon?: string;
  targetAmount: number;
  currentAmount: number;
  startDate?: string;
  deadline?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalDto {
  name: string;
  category: string;
  categoryId?: string | null;
  description?: string;
  icon?: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string;
}

export interface UpdateGoalDto extends Partial<CreateGoalDto> {}

export interface GoalRecord extends Goal {
  _id?: string;
}

export interface GoalSavePayload {
  name?: string;
  category?: string;
  categoryId?: string | number | null;
  description?: string;
  icon?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: Date | string;
}

export type GoalProgressFilter =
  | "all"
  | "completed"
  | "onTrack"
  | "atRisk"
  | "notStarted";
