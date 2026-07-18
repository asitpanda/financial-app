import { z } from "zod";
import dayjs from "dayjs";

const getFieldErrors = (error) => {
  const nextErrors = {};

  error.issues.forEach((issue) => {
    const field = issue.path?.[0];
    if (typeof field === "string" && !nextErrors[field]) {
      nextErrors[field] = issue.message;
    }
  });

  return nextErrors;
};

export const investmentSchema = z
  .object({
    accountId: z.preprocess(
      (value) => (value === undefined || value === null ? "" : String(value).trim()),
      z.string().min(1, "Account is required")
    ),
    name: z.string().trim().min(1, "Investment name is required"),
    type: z.string().optional(),
    category: z.string().optional(),
    assetTaxonomyId: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.union([z.string(), z.number()]).nullable().optional()
    ),
    institution: z.string().trim().min(1, "Institution is required"),
    totalInvested: z.coerce.number().gt(0, "Total invested amount must be greater than 0"),
    currentValue: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
      z.number().min(0, "Current value cannot be negative").optional()
    ),
    startDate: z.any().refine((value) => Boolean(value) && dayjs(value).isValid(), "Start date is required"),
    status: z.enum(["active", "matured", "closed"]),
    maturityDate: z
      .any()
      .optional()
      .nullable()
      .refine((value) => !value || dayjs(value).isValid(), "Invalid maturity date"),
    referenceNumber: z.string().optional(),
    insuranceCover: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
      z.number().min(0, "Insurance cover cannot be negative").optional()
    ),
    documents: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.assetTaxonomyId && !String(values.type || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "Investment type is required",
      });
    }

    if (
      values.startDate &&
      values.maturityDate &&
      dayjs(values.startDate).isValid() &&
      dayjs(values.maturityDate).isValid() &&
      dayjs(values.maturityDate).isBefore(dayjs(values.startDate), "day")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maturityDate"],
        message: "Maturity date cannot be before start date",
      });
    }
  });

const assetTaxonomyBaseSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  nodeType: z.string().trim().min(1, "Node type is required"),
  level: z.coerce.number().int().min(1, "Level must be between 1 and 5").max(5, "Level must be between 1 and 5"),
  parentId: z.preprocess((value) => (value === undefined || value === null ? "" : String(value)), z.string()),
  sortOrder: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 0 : Number(value)),
    z.number({ invalid_type_error: "Sort order must be a number" }).int("Sort order must be a number")
  ),
  isActive: z.enum(["true", "false"]),
});

export const createAssetTaxonomySchema = ({ taxonomyNodes = [], parentOptions = [], editingNodeId = null } = {}) =>
  assetTaxonomyBaseSchema.superRefine((values, ctx) => {
    const selectedParent = taxonomyNodes.find((node) => String(node.id) === String(values.parentId));

    if (values.level > 1 && !values.parentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentId"],
        message: "Parent is required for nested nodes",
      });
    }

    if (
      values.parentId &&
      !parentOptions.some((option) => String(option.value) === String(values.parentId))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentId"],
        message: "Parent must come from the previous level",
      });
    }

    const normalizedLabel = String(values.label || "").trim().toLowerCase();
    const duplicateAtLevel = taxonomyNodes.find(
      (node) =>
        node.id !== editingNodeId &&
        String(node.parentId ?? "") === String(selectedParent?.id ?? "") &&
        String(node.label || "").trim().toLowerCase() === normalizedLabel
    );

    if (duplicateAtLevel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["label"],
        message: "Label already exists under the selected parent",
      });
    }
  });

export const recordContributionSchema = z.object({
  contributionDate: z
    .string()
    .trim()
    .min(1, "Contribution date is required")
    .refine((value) => dayjs(value).isValid(), "Contribution date is required"),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0"),
  sourceAccountId: z.string().trim().min(1, "Please select a source account"),
  notes: z.string().optional(),
});

export const validateInvestmentForm = (form) => {
  const result = investmentSchema.safeParse(form);
  return result.success ? {} : getFieldErrors(result.error);
};

export const validateAssetTaxonomyForm = (form, options = {}) => {
  const schema = createAssetTaxonomySchema(options);
  const result = schema.safeParse(form);
  return result.success ? {} : getFieldErrors(result.error);
};

export const validateRecordContributionForm = (form) => {
  const result = recordContributionSchema.safeParse(form);
  return result.success ? {} : getFieldErrors(result.error);
};
