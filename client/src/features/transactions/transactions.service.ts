import transactionApi from "./transactions.api";
import type {
  CreateTransactionDto,
  TransactionRecord,
  TransactionSavePayload,
  UpdateTransactionDto,
} from "./transaction.types";
import { validateTransactionSavePayload } from "./transactions.schema";

interface SaveTransactionArgs {
  payload: TransactionSavePayload;
  selectedTransaction?: TransactionRecord | null;
}

const getTransactionId = (tx: TransactionRecord): string =>
  String(tx._id || tx.id);

const toRequestTransactionDto = (
  payload: TransactionSavePayload,
): CreateTransactionDto => {
  const categoryId = Number(payload.categoryId);
  const sourceAccountId = Number(payload.source);
  const goalId = Number(payload.goalId);

  return {
    type: payload.type === "income" ? "income" : "expense",
    amount: Number(payload.amount),
    categoryId,
    categoryLabelSnapshot: String(payload.category || "").trim(),
    transactionKind: payload.type === "income" ? "credit" : "debit",
    sourceAccountId: Number.isNaN(sourceAccountId)
      ? undefined
      : sourceAccountId,
    date:
      payload.date instanceof Date
        ? payload.date.toISOString()
        : payload.date
          ? String(payload.date)
          : new Date().toISOString(),
    notes: payload.notes || "",
    goalId: Number.isNaN(goalId) ? null : goalId,
  };
};

export const saveTransaction = async ({
  payload,
  selectedTransaction,
}: SaveTransactionArgs) => {
  validateTransactionSavePayload(payload);
  const requestDto: CreateTransactionDto = toRequestTransactionDto(payload);

  if (selectedTransaction) {
    return transactionApi.update(
      getTransactionId(selectedTransaction),
      requestDto as UpdateTransactionDto,
    );
  }

  return transactionApi.create(requestDto);
};
