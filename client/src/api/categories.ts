import apiClient from './client';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../types';

export const getCategories = async (): Promise<Category[]> => {
  const response = await apiClient.get('/categories');
  return response.data;
};

export const getCategoryById = async (id: string): Promise<Category> => {
  const response = await apiClient.get(`/categories/${id}`);
  return response.data;
};

export const createCategory = async (data: CreateCategoryDto): Promise<Category> => {
  const response = await apiClient.post('/categories', data);
  return response.data;
};

export const updateCategory = async (id: string, data: UpdateCategoryDto): Promise<Category> => {
  const response = await apiClient.patch(`/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await apiClient.delete(`/categories/${id}`);
};

export const categoryApi = {
  getAll: getCategories,

  getById: getCategoryById,

  create: createCategory,

  update: updateCategory,

  delete: deleteCategory,
};

export default categoryApi;
