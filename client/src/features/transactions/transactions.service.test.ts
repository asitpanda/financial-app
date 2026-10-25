import { afterEach, describe, expect, it, vi } from "vitest";
import transactionApi from "./transactions.api";
import { saveTransaction } from "./transactions.service";

afterEach(() => vi.restoreAllMocks());

describe("saveTransaction", () => {
  it("creates a transaction with normalized numeric references", async () => {
    const create = vi.spyOn(transactionApi, "create").mockResolvedValue({ id: "new" } as never);

    await saveTransaction({
      payload: {
        type: "EXPENSE",
        amount: 42.5,
        category: "  Groceries ",
        categoryId: "12",
        source: "7",
        goalId: "0",
        date: "2026-03-01",
      },
    });

    expect(create).toHaveBeenCalledWith({
      type: "EXPENSE",
      amount: 42.5,
      categoryId: 12,
      categoryLabelSnapshot: "Groceries",
      sourceAccountId: 7,
      destinationAccountId: null,
      date: "2026-03-01",
      notes: "",
      goalId: null,
    });
  });

  it("updates the selected transaction using its public or legacy id", async () => {
    const update = vi.spyOn(transactionApi, "update").mockResolvedValue({ id: "updated" } as never);

    await saveTransaction({
      payload: {
        type: "INCOME",
        amount: 100,
        category: "Salary",
        destination: "9",
        date: new Date("2026-03-01T00:00:00.000Z"),
      },
      selectedTransaction: {
        id: "transaction-1",
        _id: "legacy-transaction-1",
        type: "INCOME",
        amount: 1,
        date: "2026-01-01",
        userId: "user-1",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    });

    expect(update).toHaveBeenCalledWith("legacy-transaction-1", expect.objectContaining({
      type: "INCOME",
      destinationAccountId: 9,
      date: "2026-03-01T00:00:00.000Z",
    }));
  });

  it("does not call the API when validation fails", async () => {
    const create = vi.spyOn(transactionApi, "create");

    await expect(saveTransaction({
      payload: {
        type: "TRANSFER",
        amount: 10,
        source: "account-1",
        destination: "account-1",
        date: "2026-03-01",
      },
    })).rejects.toThrow("Source and destination must be different accounts");

    expect(create).not.toHaveBeenCalled();
  });
});