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
  const categoryId =
    payload.categoryId === null || payload.categoryId === undefined
      ? NaN
      : Number(payload.categoryId);
  const sourceAccountId = Number(payload.source);
  const destinationAccountId = Number(payload.destination);
  const goalId =
    payload.goalId === null || payload.goalId === undefined
      ? NaN
      : Number(payload.goalId);

  return {
    type: payload.type || "EXPENSE",
    amount: Number(payload.amount),
    categoryId: Number.isNaN(categoryId) || categoryId <= 0 ? null : categoryId,
    categoryLabelSnapshot: payload.category?.trim() || null,
    sourceAccountId: Number.isNaN(sourceAccountId)
      ? null
      : sourceAccountId,
    destinationAccountId: Number.isNaN(destinationAccountId)
      ? null
      : destinationAccountId,
    date:
      payload.date instanceof Date
        ? payload.date.toISOString()
        : payload.date
          ? String(payload.date)
          : new Date().toISOString(),
    notes: payload.notes || "",
    goalId: Number.isNaN(goalId) || goalId <= 0 ? null : goalId,
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
