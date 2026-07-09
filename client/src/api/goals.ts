import apiClient from './client';
import { Goal, CreateGoalDto, UpdateGoalDto } from '../types';

export const getGoals = async (): Promise<Goal[]> => {
  const response = await apiClient.get('/goals');
  return response.data;
};

export const getGoalById = async (id: string): Promise<Goal> => {
  const response = await apiClient.get(`/goals/${id}`);
  return response.data;
};

export const createGoal = async (data: CreateGoalDto): Promise<Goal> => {
  const response = await apiClient.post('/goals', data);
  return response.data;
};

export const updateGoal = async (id: string, data: UpdateGoalDto): Promise<Goal> => {
  const response = await apiClient.patch(`/goals/${id}`, data);
  return response.data;
};

export const deleteGoal = async (id: string): Promise<void> => {
  await apiClient.delete(`/goals/${id}`);
};

export const goalApi = {
  getAll: getGoals,

  getById: getGoalById,

  create: createGoal,

  update: updateGoal,

  delete: deleteGoal,
};

export default goalApi;
