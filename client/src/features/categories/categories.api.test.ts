import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from './categories.api';

afterEach(() => vi.restoreAllMocks());

describe('categories.api', () => {
  it('supports CRUD operations and preserves API errors', async () => {
    const data = [{ id: 'category-1' }];
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data } as never);
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data } as never);
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data } as never);
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({} as never);
    const payload = {} as Parameters<typeof createCategory>[0];
    const updatePayload = {} as Parameters<typeof updateCategory>[1];
    const failure = new Error('Category request failed');
    get.mockRejectedValueOnce(failure);

    await expect(getCategories()).rejects.toBe(failure);
    await expect(getCategoryById('category-1')).resolves.toBe(data);
    await expect(createCategory(payload)).resolves.toBe(data);
    await expect(updateCategory('category-1', updatePayload)).resolves.toBe(data);
    await expect(deleteCategory('category-1')).resolves.toBeUndefined();

    expect(get).toHaveBeenNthCalledWith(1, '/categories');
    expect(get).toHaveBeenNthCalledWith(2, '/categories/category-1');
    expect(post).toHaveBeenCalledWith('/categories', payload);
    expect(patch).toHaveBeenCalledWith('/categories/category-1', updatePayload);
    expect(remove).toHaveBeenCalledWith('/categories/category-1');
  });
});