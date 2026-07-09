import { createGoal, deleteGoal, updateGoal } from '../../api/goals';
import type { ActionContract } from '../../types/action';

interface SaveGoalActionArgs {
  payload: {
    name?: string;
    category?: string;
    description?: string;
    targetAmount?: number;
    currentAmount?: number;
    icon?: string;
    deadline?: string;
  };
  selectedGoal: any | null;
  getGoalId: (goal: any) => string;
  onSuccess: () => Promise<void> | void;
}

interface DeleteGoalActionArgs {
  targetId?: string | null;
  onSuccess: () => Promise<void> | void;
}

export function buildSaveGoalAction({
  payload,
  selectedGoal,
  getGoalId,
  onSuccess,
}: SaveGoalActionArgs): ActionContract {
  const isEdit = Boolean(selectedGoal);

  return {
    intent: isEdit ? 'Update Goal' : 'Create Goal',
    payload,
    precheck: () => {
      const hasName = Boolean(payload?.name && payload.name.trim());
      const hasCategory = Boolean(payload?.category && payload.category.trim());
      const hasTarget = Number(payload?.targetAmount || 0) > 0;
      return hasName && hasCategory && hasTarget;
    },
    execute: async () => {
      if (isEdit) {
        await updateGoal(getGoalId(selectedGoal), payload);
      } else {
        await createGoal(payload);
      }

      await onSuccess();
    },
    feedback: {
      loading: isEdit ? 'Updating goal...' : 'Creating goal...',
      success: isEdit ? 'Goal updated successfully' : 'Goal added successfully',
      error: isEdit ? 'Failed to update goal' : 'Failed to add goal',
    },
  };
}

export function buildDeleteGoalAction({ targetId, onSuccess }: DeleteGoalActionArgs): ActionContract {
  return {
    intent: 'Delete Goal',
    payload: { targetId },
    precheck: () => Boolean(targetId),
    execute: async () => {
      await deleteGoal(String(targetId));
      await onSuccess();
    },
    feedback: {
      loading: 'Deleting goal...',
      success: 'Goal deleted successfully',
      error: 'Failed to delete goal',
    },
  };
}
