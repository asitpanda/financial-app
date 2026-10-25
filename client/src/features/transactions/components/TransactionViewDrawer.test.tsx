import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import { TransactionViewDrawer } from "./TransactionViewDrawer";
import type { TransactionRecord } from "../transaction.types";

const transaction: TransactionRecord = {
  id: "transaction-1",
  type: "EXPENSE",
  amount: 1250,
  category: "Groceries",
  sourceAccountId: 7,
  destinationAccountId: null,
  date: "2026-10-19T00:00:00.000Z",
  notes: "Weekly shopping",
  goalId: null,
  userId: "user-1",
  createdAt: "2026-10-19T00:00:00.000Z",
  updatedAt: "2026-10-19T00:00:00.000Z",
};

describe("TransactionViewDrawer", () => {
  it("shows a not-found state and closes it", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <TransactionViewDrawer
        open
        onClose={onClose}
        transaction={null}
        goalName=""
      />,
    );

    expect(screen.getByText("Transaction Not Found")).toBeInTheDocument();
    expect(
      screen.getByText("This transaction no longer exists or the list changed."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders transaction details and routes edit and delete actions", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onDelete = vi.fn();
    const onEdit = vi.fn();

    renderWithProviders(
      <TransactionViewDrawer
        open
        onClose={onClose}
        transaction={transaction}
        goalName="Emergency fund"
        accountNameById={{ 7: "Primary Checking" }}
        onDelete={onDelete}
        onEdit={onEdit}
      />,
    );

    expect(screen.getByText("Transaction Details")).toBeInTheDocument();
    expect(screen.getByText("- ₹1,250")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Primary Checking")).toBeInTheDocument();
    expect(screen.getByText("Emergency fund")).toBeInTheDocument();
    expect(screen.getByText("Weekly shopping")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Edit Transaction" }));

    expect(onDelete).toHaveBeenCalledWith(transaction);
    expect(onEdit).toHaveBeenCalledWith(transaction);
    expect(onClose).not.toHaveBeenCalled();
  });
});