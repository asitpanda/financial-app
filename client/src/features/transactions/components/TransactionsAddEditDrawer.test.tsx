import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "../../../test/test-utils";
import { getFinancialAccounts } from "../../accounts/financialAccounts.api";
import TransactionsAddEditDrawer from "./TransactionsAddEditDrawer";

vi.mock("../../accounts/financialAccounts.api", () => ({
  getFinancialAccounts: vi.fn(),
}));

describe("TransactionsAddEditDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFinancialAccounts).mockResolvedValue([
      { id: 7, displayName: "Primary Checking" } as never,
      { id: 8, displayName: "HDFC Savings" } as never,
    ]);
  });

  it("shows only the fields required for the selected transaction type", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <TransactionsAddEditDrawer
        open
        onClose={vi.fn()}
        categories={[{ name: "Salary", type: "income" }]}
      />,
    );

    await waitFor(() => expect(getFinancialAccounts).toHaveBeenCalledOnce());
    expect(screen.getByText("Source account")).toBeInTheDocument();
    expect(screen.queryByText("Destination account")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(screen.getByRole("option", { name: "Income" }));

    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Destination account")).toBeInTheDocument();
    expect(screen.queryByText("Source account")).not.toBeInTheDocument();
  });

  it("does not submit an expense until required fields are valid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(
      <TransactionsAddEditDrawer
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        categories={[{ name: "Groceries", type: "expense" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Amount must be greater than 0")).toBeInTheDocument();
    expect(screen.getByText("Category is required")).toBeInTheDocument();
    expect(screen.getByText("Source account is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a normalized expense payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(null);

    renderWithProviders(
      <TransactionsAddEditDrawer
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        categories={[{ id: 3, name: "Groceries", type: "expense" }]}
      />,
    );

    await waitFor(() => expect(getFinancialAccounts).toHaveBeenCalledOnce());
    await user.type(screen.getByPlaceholderText("Enter amount"), "1250");
    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(screen.getByRole("option", { name: "Groceries" }));
    await user.click(screen.getAllByRole("combobox")[2]);
    await user.click(screen.getByRole("option", { name: "Primary Checking" }));
    await user.type(
      screen.getByPlaceholderText("Add any context for this transaction"),
      "  Weekly shopping  ",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      type: "EXPENSE",
      amount: 1250,
      category: "Groceries",
      categoryId: 3,
      source: "7",
      destination: "",
      goalId: null,
      notes: "  Weekly shopping  ",
    });
    expect(payload.date).toBeInstanceOf(Date);
  });

  it("displays a returned submit error and keeps the form available", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue("Transaction could not be saved");

    renderWithProviders(
      <TransactionsAddEditDrawer
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        categories={[{ name: "Groceries", type: "expense" }]}
      />,
    );

    await user.type(screen.getByPlaceholderText("Enter amount"), "10");
    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(screen.getByRole("option", { name: "Groceries" }));
    await user.click(screen.getAllByRole("combobox")[2]);
    await user.click(screen.getByRole("option", { name: "Primary Checking" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Transaction could not be saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});