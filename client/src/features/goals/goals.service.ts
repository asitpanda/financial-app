import goalApi from "./goals.api";
import {
  validateGoalSavePayload,
} from "./goals.schema";
import type {
  CreateGoalDto,
  GoalRecord,
  GoalSavePayload,
  UpdateGoalDto,
} from "./goal.types";

interface SaveGoalArgs {
  payload: GoalSavePayload;
  selectedGoal?: GoalRecord | null;
}

const getGoalId = (goal: GoalRecord): string =>
  String(goal._id || goal.id);

const toRequestGoalDto = (payload: GoalSavePayload): CreateGoalDto => ({
  name: String(payload.name || "").trim(),
  categoryId: Number(payload.categoryId),
  categoryLabelSnapshot: String(payload.category || "").trim(),
  description: payload.description,
  icon: payload.icon,
  targetAmount: Number(payload.targetAmount || 0),
  currentAmount: Number(payload.currentAmount || 0),
  deadline:
    payload.deadline instanceof Date
      ? payload.deadline.toISOString()
      : payload.deadline
        ? String(payload.deadline)
        : undefined,
});

export const saveGoal = async ({ payload, selectedGoal }: SaveGoalArgs) => {
  validateGoalSavePayload(payload);

  const categoryId = Number(payload.categoryId);
  if (!categoryId || !Number.isInteger(categoryId)) {
    throw new Error("A valid goal category must be selected");
  }

  const requestDto = toRequestGoalDto(payload);

  if (selectedGoal) {
    return goalApi.update(getGoalId(selectedGoal), requestDto as UpdateGoalDto);
  }

  return goalApi.create(requestDto);
};

export const removeGoal = async (id: string) => {
  await goalApi.delete(id);
};
