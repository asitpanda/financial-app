export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  categoryId?: string | null;
  categoryLabelSnapshot?: string;
  source: string;
  date: string;
  notes?: string;
  goalId?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionDto {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  categoryId?: string | null;
  source: string;
  date?: string;
  notes?: string;
  goalId?: string | null;
}

export interface UpdateTransactionDto extends Partial<CreateTransactionDto> {}

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

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'goal';
  icon?: string;
  color?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginDto {
  identifier: string; // Can be email, userId, or mobile
  password: string;
}

export interface RegisterDto {
  email: string;
  userId?: string;
  mobile?: string;
  password: string;
  name?: string;
}
