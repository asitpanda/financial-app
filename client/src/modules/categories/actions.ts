import { createCategory, deleteCategory, updateCategory } from '../../api/categories';
import type { ActionContract } from '../../types/action';
import type { CreateCategoryDto, UpdateCategoryDto } from '../../types';

interface SaveCategoryActionArgs {
  payload: {
    name?: string;
    type?: 'income' | 'expense';
    icon?: string;
    color?: string;
  };
  selectedCategory: any | null;
  getCategoryId: (category: any) => string;
  onSuccess: () => Promise<void> | void;
}

interface DeleteCategoryActionArgs {
  targetId?: string | null;
  onSuccess: () => Promise<void> | void;
}

const toCategoryDto = (payload: SaveCategoryActionArgs['payload']): CreateCategoryDto => ({
  name: String(payload.name || '').trim(),
  type: payload.type as 'income' | 'expense',
  icon: payload.icon,
  color: payload.color,
});

export function buildSaveCategoryAction({
  payload,
  selectedCategory,
  getCategoryId,
  onSuccess,
}: SaveCategoryActionArgs): ActionContract {
  const isEdit = Boolean(selectedCategory);

  return {
    intent: isEdit ? 'Update Category' : 'Create Category',
    payload,
    precheck: () => {
      const hasName = Boolean(payload?.name && payload.name.trim());
      const hasType = payload?.type === 'income' || payload?.type === 'expense';
      return hasName && hasType;
    },
    execute: async () => {
      const normalizedPayload = toCategoryDto(payload);

      if (isEdit) {
        await updateCategory(
          getCategoryId(selectedCategory),
          normalizedPayload as UpdateCategoryDto
        );
      } else {
        await createCategory(normalizedPayload);
      }

      await onSuccess();
    },
    feedback: {
      loading: isEdit ? 'Updating category...' : 'Creating category...',
      success: isEdit ? 'Category updated successfully' : 'Category added successfully',
      error: isEdit ? 'Failed to update category' : 'Failed to add category',
    },
  };
}

export function buildDeleteCategoryAction({
  targetId,
  onSuccess,
}: DeleteCategoryActionArgs): ActionContract {
  return {
    intent: 'Delete Category',
    payload: { targetId },
    precheck: () => Boolean(targetId),
    execute: async () => {
      await deleteCategory(String(targetId));
      await onSuccess();
    },
    feedback: {
      loading: 'Deleting category...',
      success: 'Category deleted successfully',
      error: 'Failed to delete category',
    },
  };
}
