import { z } from "zod";
import dayjs from "dayjs";
const DEFAULT_GOAL_ICON = "gift";

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Goal name is required"),
  category: z.string().trim().min(1, "Goal category is required"),
  description: z.string().max(240, "Description must be 240 characters or less"),
  icon: z.string().optional(),
  targetAmount: z.coerce.number().gt(0, "Target amount must be greater than 0"),
  currentAmount: z
    .preprocess(
      (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
      z.number().min(0, "Current amount cannot be negative").optional()
    ),
  deadline: z
    .any()
    .optional()
    .nullable()
    .refine((value) => !value || dayjs(value).isValid(), "Invalid deadline"),
});

export const createDefaultGoalForm = () => ({
  name: "",
  category: "",
  description: "",
  icon: DEFAULT_GOAL_ICON,
  targetAmount: "",
  currentAmount: "",
  deadline: null,
});

export const toGoalFormState = (goal) => {
  if (!goal) return createDefaultGoalForm();
  return {
    name: goal.name || "",
    category: goal.category || "",
    description: goal.description || "",
    icon: goal.icon || DEFAULT_GOAL_ICON,
    targetAmount: goal.targetAmount ?? "",
    currentAmount: goal.currentAmount ?? "",
    deadline: goal.deadline ? dayjs(goal.deadline) : null,
  };
};
