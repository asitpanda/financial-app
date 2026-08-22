import { z } from "zod";
import dayjs from "dayjs";
import type { ConfigType } from "dayjs";
import type { TransactionRecord } from "./transaction.types";
import type { TransactionSavePayload } from "./transaction.types";

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0"),
  category: z.string().trim().optional(),
  source: z.string().trim().optional(),
  destination: z.string().trim().optional(),
  goalId: z.string().optional().nullable(),
  date: z.custom<ConfigType>(
    (value) => Boolean(value) && dayjs(value as ConfigType).isValid(),
    "Date is required",
  ),
  notes: z.string().optional(),
}).superRefine((values, context) => {
  if (values.type === "INCOME" || values.type === "EXPENSE") {
    if (!values.category) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["category"], message: "Category is required" });
    }
  }

  if (values.type === "EXPENSE" || values.type === "TRANSFER") {
    if (!values.source) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["source"], message: "Source account is required" });
    }
  }

  if (values.type === "INCOME" || values.type === "TRANSFER") {
    if (!values.destination) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["destination"], message: "Destination account is required" });
    }
  }

  if (values.type === "TRANSFER" && values.source && values.source === values.destination) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["destination"], message: "Source and destination must be different accounts" });
  }
});

export type TransactionFormState = z.infer<typeof transactionSchema>;

export const createDefaultTransactionForm = (): TransactionFormState => ({
  type: "EXPENSE",
  amount: 0,
  category: "",
  source: "",
  destination: "",
  goalId: "",
  date: dayjs(),
  notes: "",
});

export const toTransactionFormState = (
  initialValues: Partial<TransactionRecord> | null,
): TransactionFormState => {
  if (!initialValues) return createDefaultTransactionForm();

  const parsedDate = initialValues.date || initialValues.createdAt;
  const normalizedDate =
    parsedDate && dayjs(parsedDate).isValid() ? dayjs(parsedDate) : dayjs();

  const normalizedSource =
    initialValues.sourceAccountId != null
      ? String(initialValues.sourceAccountId)
      : initialValues.source
        ? String(initialValues.source)
        : "";

  return {
    type: initialValues.type || "EXPENSE",
    amount: initialValues.amount ?? 0,
    category: initialValues.category || "",
    source: normalizedSource,
    destination:
      initialValues.destinationAccountId != null
        ? String(initialValues.destinationAccountId)
        : "",
    goalId: initialValues.goalId || "",
    date: normalizedDate,
    notes: initialValues.notes || "",
  };
};

export const validateTransactionSavePayload = (
  payload: TransactionSavePayload,
) => {
  return transactionSchema.parse({
    type: payload.type,
    amount: payload.amount,
    category: payload.category,
    source: payload.source,
    destination: payload.destination,
    goalId: payload.goalId != null ? String(payload.goalId) : undefined,
    date: payload.date,
    notes: payload.notes,
  });
};
