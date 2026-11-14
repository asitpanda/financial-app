import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../store/appStore";
import { renderWithProviders, userEvent } from "../test/test-utils";
import type { ScreenRenderContext } from "./screenRegistry";
import AppRouter from "./AppRouter";

vi.mock("../features/dashboard/Dashboard", () => ({
  default: () => <div>Dashboard route content</div>,
}));
vi.mock("../features/transactions/Transactions", () => ({
  default: (props: {
    prefetchedTransactions: Array<{ id: string }>;
    prefillFilter: { periodLabel?: string } | null;
  }) => (
    <div>
      Transactions route content {props.prefetchedTransactions[0]?.id} {props.prefillFilter?.periodLabel}
    </div>
  ),
}));
vi.mock("../features/goals/Goals", () => ({
  default: () => <div>Goals route content</div>,
}));
vi.mock("../features/categories/Categories", () => ({
  default: () => <div>Categories route content</div>,
}));
vi.mock("../features/investments/Investments", () => ({
  default: () => <div>Investments route content</div>,
}));
vi.mock("../features/locker/locker", () => ({
  default: () => <div>Locker route content</div>,
}));
vi.mock("../features/settings/Settings", () => ({
  default: () => <div>Settings route content</div>,
}));

describe("AppRouter", () => {
  beforeEach(() => {
    useAppStore.setState({ activeScreen: "dashboard" });
  });

  const createContext = (
    overrides: Partial<ScreenRenderContext> = {},
  ): ScreenRenderContext => ({
    transactionsPrefetch: [],
    transactionsPrefillFilter: null,
    onOpenTransactionsFromDashboard: vi.fn(),
    ...overrides,
  });

  const renderAt = (
    pathname: string,
    context: ScreenRenderContext = createContext(),
  ) =>
    renderWithProviders(<AppRouter context={context} />, {
      router: { initialEntries: [pathname] },
    });

  it("renders the deep-linked screen, syncs the active screen, and forwards transaction context", async () => {
    const context = createContext({
      transactionsPrefetch: [{
        id: "transaction-1",
        type: "EXPENSE",
        amount: 25,
        date: "2026-11-09",
        userId: "user-1",
        createdAt: "2026-11-09T00:00:00.000Z",
        updatedAt: "2026-11-09T00:00:00.000Z",
      }],
      transactionsPrefillFilter: { mode: "monthly", periodLabel: "November 2026" },
    });

    renderAt("/transactions", context);

    expect(screen.getByText(/Transactions route content transaction-1 November 2026/)).toBeInTheDocument();
    expect(screen.getByText("You are on - Transactions")).toBeInTheDocument();
    await waitFor(() => expect(useAppStore.getState().activeScreen).toBe("transactions"));
  });

  it("changes the URL and rendered screen when navigation is requested from the sidebar", async () => {
    renderAt("/dashboard");

    await userEvent.click(screen.getByRole("button", { name: "Investments" }));

    expect(await screen.findByText("Investments route content")).toBeInTheDocument();
    expect(screen.getByText("You are on - Investments")).toBeInTheDocument();
    await waitFor(() => expect(useAppStore.getState().activeScreen).toBe("investments"));
  });

  it.each(["/", "/missing-route"])("redirects %s to the dashboard", async (pathname) => {
    renderAt(pathname);

    expect(await screen.findByText("Dashboard route content")).toBeInTheDocument();
    expect(await screen.findByText("You are on - Dashboard")).toBeInTheDocument();
    await waitFor(() => expect(useAppStore.getState().activeScreen).toBe("dashboard"));
  });
});