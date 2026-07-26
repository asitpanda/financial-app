// @ts-nocheck
import { z } from "zod";
import { CATEGORY_ICON_KEYS } from "../../constants/categoryIcons";

const categoryBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .min(3, "Category name must be at least 3 characters"),
  type: z.enum(["income", "expense"]),
  icon: z
    .string()
    .optional()
    .refine((value) => !value || CATEGORY_ICON_KEYS.includes(value), "Please select a valid icon"),
  color: z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim())
    .refine(
      (value) => !value || /^#?[0-9A-Fa-f]{6}$/.test(value),
      "Color must be a valid 6-digit hex (e.g. #22c55e)"
    ),
});

export const createCategorySchema = ({ existingNames = [], currentName = "" } = {}) => {
  const normalizedExistingNames = existingNames
    .map((name) => name?.trim().toLowerCase())
    .filter(Boolean);
  const normalizedCurrentName = currentName?.trim().toLowerCase() || "";

  return categoryBaseSchema.superRefine((values, ctx) => {
    const normalizedValue = values.name?.trim().toLowerCase();
    if (!normalizedValue || normalizedValue === normalizedCurrentName) {
      return;
    }

    if (normalizedExistingNames.includes(normalizedValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "Category name already exists",
      });
    }
  });
};

export const categorySchema = createCategorySchema();

export const createDefaultCategoryForm = () => ({
  name: "",
  type: "expense",
  icon: "",
  color: "",
});

export const toCategoryFormState = (category) => {
  if (!category) return createDefaultCategoryForm();
  return {
    name: category.name || "",
    type: category.type || "expense",
    icon: category.icon || "",
    color: category.color || "",
  };
};
