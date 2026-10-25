import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  createDefaultTransactionForm,
  toTransactionFormState,
  transactionSchema,
  validateTransactionSavePayload,
} from "./transactions.schema";

describe("createDefaultTransactionForm", () => {
  it("creates the default expense form", () => {
    expect(createDefaultTransactionForm()).toMatchObject({
      type: "EXPENSE",
      amount: 0,
      category: "",
      source: "",
      destination: "",
      goalId: "",
      notes: "",
    });
  });
});

describe("transactionSchema", () => {
  it("accepts valid income, expense, and transfer forms", () => {
    const common = { amount: "25.50", date: "2026-01-15" };

    expect(transactionSchema.parse({
      ...common,
      type: "INCOME",
      category: "Salary",
      destination: "account-1",
    })).toMatchObject({ amount: 25.5, type: "INCOME" });
    expect(transactionSchema.parse({
      ...common,
      type: "EXPENSE",
      category: "Groceries",
      source: "account-1",
    })).toMatchObject({ amount: 25.5, type: "EXPENSE" });
    expect(transactionSchema.parse({
      ...common,
      type: "TRANSFER",
      source: "account-1",
      destination: "account-2",
    })).toMatchObject({ amount: 25.5, type: "TRANSFER" });
  });

  it("rejects missing type-specific fields and same-account transfers", () => {
    const missingFields = transactionSchema.safeParse({
      type: "EXPENSE",
      amount: 10,
      date: "2026-01-15",
    });
    const sameAccountTransfer = transactionSchema.safeParse({
      type: "TRANSFER",
      amount: 10,
      source: "account-1",
      destination: "account-1",
      date: "2026-01-15",
    });

    expect(missingFields.success).toBe(false);
    expect(missingFields.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["category", "source"]),
    );
    expect(sameAccountTransfer.success).toBe(false);
    expect(sameAccountTransfer.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["destination"],
          message: "Source and destination must be different accounts",
        }),
      ]),
    );
  });

  it("rejects non-positive amounts and invalid dates", () => {
    const result = transactionSchema.safeParse({
      type: "INCOME",
      amount: 0,
      destination: "account-1",
      date: "not-a-date",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["amount", "date"]),
    );
  });
});

describe("toTransactionFormState", () => {
  it("normalizes existing transaction values for editing", () => {
    expect(toTransactionFormState({
      id: "transaction-1",
      type: "INCOME",
      amount: 100,
      sourceAccountId: 7,
      destinationAccountId: 9,
      goalId: 3,
      date: "2026-02-01",
      userId: "user-1",
      createdAt: "2026-02-02",
      updatedAt: "2026-02-02",
    })).toMatchObject({
      type: "INCOME",
      source: "7",
      destination: "9",
      goalId: "3",
      date: dayjs("2026-02-01"),
    });

  });
});

describe("validateTransactionSavePayload", () => {
  it("accepts a valid expense save payload", () => {
    expect(() => validateTransactionSavePayload({
      type: "EXPENSE",
      amount: 12,
      category: "Food",
      source: "7",
      date: "2026-02-01",
    })).not.toThrow();
  });
});