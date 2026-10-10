import type { ReactNode } from "react";
import {
  mdiChartBar,
  mdiCog,
  mdiFileDocument,
  mdiFlag,
  mdiLockOutline,
  mdiShape,
  mdiViewDashboard,
} from "@mdi/js";
import Dashboard from "../features/dashboard/Dashboard";
import Categories from "../features/categories/Categories";
import Goals from "../features/goals/Goals";
import Investments from "../features/investments/Investments";
import Locker from "../features/locker/locker";
import Transactions from "../features/transactions/Transactions";
import type { TransactionRecord } from "../features/transactions/transaction.types";

export type Screen =
  | "dashboard"
  | "transactions"
  | "locker"
  | "goals"
  | "categories"
  | "investments"
  | "settings";

export type TransactionsPrefillFilter = {
  mode?: "monthly" | "yearly";
  fiscalYearStart?: number;
  month?: number;
  periodLabel?: string;
};

export type ScreenRenderContext = {
  transactionsPrefetch: TransactionRecord[];
  transactionsPrefillFilter: TransactionsPrefillFilter | null;
  onOpenTransactionsFromDashboard: (
    payload: DashboardTransactionNavigationPayload,
  ) => void;
};

type DashboardTransactionNavigationPayload = {
  prefetchedTransactions: TransactionRecord[];
  prefillFilter: TransactionsPrefillFilter | null;
};

export interface ScreenConfig {
  key: Screen;
  path: `/${string}`;
  label: string;
  icon: string;
  showInSidebar: boolean;
  render: (context: ScreenRenderContext) => ReactNode;
}

export const SCREEN_CONFIGS: Record<Screen, ScreenConfig> = {
  dashboard: {
    key: "dashboard",
    path: "/dashboard",
    label: "Dashboard",
    icon: mdiViewDashboard,
    showInSidebar: true,
    render: ({ onOpenTransactionsFromDashboard }) => (
      <Dashboard
        onOpenTransactionsFromDashboard={onOpenTransactionsFromDashboard}
      />
    ),
  },
  transactions: {
    key: "transactions",
    path: "/transactions",
    label: "Transactions",
    icon: mdiFileDocument,
    showInSidebar: true,
    render: ({ transactionsPrefetch, transactionsPrefillFilter }) => (
      <Transactions
        prefetchedTransactions={transactionsPrefetch}
        prefillFilter={transactionsPrefillFilter}
      />
    ),
  },
  goals: {
    key: "goals",
    path: "/goals",
    label: "Goals",
    icon: mdiFlag,
    showInSidebar: true,
    render: () => <Goals />,
  },
  categories: {
    key: "categories",
    path: "/categories",
    label: "Categories",
    icon: mdiShape,
    showInSidebar: true,
    render: () => <Categories />,
  },
  investments: {
    key: "investments",
    path: "/investments",
    label: "Investments",
    icon: mdiChartBar,
    showInSidebar: true,
    render: () => <Investments />,
  },
  locker: {
    key: "locker",
    path: "/locker",
    label: "Locker",
    icon: mdiLockOutline,
    showInSidebar: true,
    render: () => <Locker />,
  },
  settings: {
    key: "settings",
    path: "/settings",
    label: "Settings",
    icon: mdiCog,
    showInSidebar: true,
    render: () => null,
  },
};

export const SIDEBAR_SCREEN_CONFIGS = Object.values(SCREEN_CONFIGS).filter(
  (config) => config.showInSidebar,
);

export const getScreenConfig = (screen: Screen): ScreenConfig =>
  SCREEN_CONFIGS[screen];
