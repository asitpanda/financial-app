import { z } from "zod";
import dayjs from "dayjs";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0"),
  category: z.string().trim().min(1, "Category is required"),
  source: z.string().trim().min(1, "Bank / source is required"),
  goalId: z.string().optional().nullable(),
  date: z
    .any()
    .refine((value) => Boolean(value) && dayjs(value).isValid(), "Date is required"),
  notes: z.string().optional(),
});

export const createDefaultTransactionForm = () => ({
  type: "expense",
  amount: "",
  category: "",
  source: "",
  goalId: "",
  date: dayjs(),
  notes: "",
});

export const toTransactionFormState = (initialValues) => {
  if (!initialValues) return createDefaultTransactionForm();

  const parsedDate = initialValues.date || initialValues.createdAt;
  const normalizedDate = parsedDate && dayjs(parsedDate).isValid() ? dayjs(parsedDate) : dayjs();

  const normalizedSource =
    initialValues.sourceAccountId != null
      ? String(initialValues.sourceAccountId)
      : (initialValues.source ? String(initialValues.source) : "");

  return {
    type: initialValues.type || "expense",
    amount: initialValues.amount ?? "",
    category: initialValues.category || "",
    source: normalizedSource,
    goalId: initialValues.goalId || "",
    date: normalizedDate,
    notes: initialValues.notes || "",
  };
};
