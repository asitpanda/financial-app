import { z } from "zod";
import dayjs from "dayjs";
import type { ConfigType } from "dayjs";
import type { TransactionRecord } from "./transaction.types";
import type { TransactionSavePayload } from "./transaction.types";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0"),
  category: z.string().trim().min(1, "Category is required"),
  source: z.string().trim().min(1, "Bank / source is required"),
  goalId: z.string().optional().nullable(),
  date: z.custom<ConfigType>(
    (value) => Boolean(value) && dayjs(value as ConfigType).isValid(),
    "Date is required",
  ),
  notes: z.string().optional(),
});

export type TransactionFormState = z.infer<typeof transactionSchema>;

export const createDefaultTransactionForm = (): TransactionFormState => ({
  type: "expense",
  amount: 0,
  category: "",
  source: "",
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
    type: initialValues.type || "expense",
    amount: initialValues.amount ?? 0,
    category: initialValues.category || "",
    source: normalizedSource,
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
    goalId: payload.goalId != null ? String(payload.goalId) : undefined,
    date: payload.date,
    notes: payload.notes,
  });
};
