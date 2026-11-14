import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "./features/auth/auth.api";
import { useAuth } from "./features/auth/useAuth";
import type { TransactionRecord } from "./features/transactions/transaction.types";
import { usePreferencesStore } from "./store/preferencesStore";
import * as navigation from "./services/navigation";
import { renderWithProviders, userEvent } from "./test/test-utils";
import type { ScreenRenderContext } from "./routing/screenRegistry";
import App from "./App";

vi.mock("./routing/AppRouter", () => ({
  default: ({ context }: { context: ScreenRenderContext }) => (
    <div>
      <div data-testid="prefetched-transactions">
        {context.transactionsPrefetch.map((transaction) => transaction.id).join(",") || "none"}
      </div>
      <div data-testid="transaction-period">
        {context.transactionsPrefillFilter?.periodLabel || "none"}
      </div>
      <button
        onClick={() => context.onOpenTransactionsFromDashboard({
          prefetchedTransactions: [{
            id: "transaction-1",
            type: "EXPENSE",
            amount: 25,
            date: "2026-03-10",
            userId: "user-1",
            createdAt: "2026-03-10T00:00:00.000Z",
            updatedAt: "2026-03-10T00:00:00.000Z",
          } as TransactionRecord],
          prefillFilter: { mode: "monthly", periodLabel: "March 2026" },
        })}
      >
        Open dashboard transactions
      </button>
    </div>
  ),
}));

vi.mock("./features/auth/components/IdleTimeoutGuard", () => ({
  default: () => null,
}));

vi.mock("./components/common", () => ({
  NotificationCenter: () => null,
}));

const authenticatedUser = {
  id: "user-1",
  email: "user@example.com",
  name: "Test User",
};
const preferences = { currencyDisplay: "symbol" as const };

describe("App", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuth.setState({
      user: authenticatedUser,
      token: "token-1",
      isAuthenticated: true,
      loading: false,
      logoutReason: null,
    });
    usePreferencesStore.setState({ preferences: null, sessionId: 1, isSaving: false });
  });

  afterEach(() => vi.restoreAllMocks());

  it("retries loading preferences after bootstrap fails", async () => {
    const getMe = vi.spyOn(authApi, "getMe")
      .mockRejectedValueOnce(new Error("Request failed"))
      .mockResolvedValueOnce({ ...authenticatedUser, preferences });
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByText("Unable to load your preferences.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(usePreferencesStore.getState().preferences).toEqual(preferences);
    });
    expect(getMe).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("prefetched-transactions")).toHaveTextContent("none");
  });

  it("signs out when bootstrap returns no preferences", async () => {
    vi.spyOn(authApi, "getMe").mockResolvedValue({ ...authenticatedUser, preferences: null });

    renderWithProviders(<App />);

    expect(await screen.findByText("Unable to load your preferences.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(useAuth.getState()).toMatchObject({ token: null, isAuthenticated: false });
    expect(sessionStorage.getItem("token")).toBeNull();
  });

  it("forwards dashboard transaction context and navigates to transactions", async () => {
    usePreferencesStore.setState({ preferences, sessionId: 2, isSaving: false });
    const navigate = vi.spyOn(navigation, "navigateTo").mockImplementation(() => {});

    renderWithProviders(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Open dashboard transactions" }));

    expect(screen.getByTestId("prefetched-transactions")).toHaveTextContent("transaction-1");
    expect(screen.getByTestId("transaction-period")).toHaveTextContent("March 2026");
    expect(navigate).toHaveBeenCalledWith("transactions");
  });
});