import { useState, useEffect } from "react";
import { CircularProgress, Box } from "@mui/material";
import PrivateRoute from "./features/auth/components/PrivateRoute";
import AppRouter from "./routing/AppRouter";
import { authApi } from "./features/auth/auth.api";
import { useAuth } from "./features/auth/useAuth";
import { navigateTo } from "./services/navigation";
import { NotificationCenter } from "./components/common";
import type { TransactionRecord } from "./features/transactions/transaction.types";
import "./App.css";
import type {
  ScreenRenderContext,
  TransactionsPrefillFilter,
} from "./routing/screenRegistry";

type DashboardTransactionNavigationPayload = ScreenRenderContext["onOpenTransactionsFromDashboard"] extends (
  payload: infer Payload,
) => void
  ? Payload
  : never;

export default function App() {
  const { token, user, isAuthenticated, loading, setLoading, setUser, logout } =
    useAuth();
  const [transactionsPrefetch, setTransactionsPrefetch] = useState<TransactionRecord[]>([]);
  const [transactionsPrefillFilter, setTransactionsPrefillFilter] = useState<
    TransactionsPrefillFilter | null
  >(null);

  // Check for existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      if (token && !user) {
        setLoading(true);
        try {
          const user = await authApi.getMe();
          setUser(user);
        } catch (error) {
          console.warn("Token validation failed during bootstrap:", error);
          logout();
        } finally {
          setLoading(false);
        }
      }
    };

    initAuth();
  }, [token, user, setLoading, setUser, logout]);

  useEffect(() => {
    if (isAuthenticated) return;
    setTransactionsPrefetch([]);
    setTransactionsPrefillFilter(null);
  }, [isAuthenticated]);

  // Show loading spinner while validating token
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  const handleOpenTransactionsFromDashboard = (
    payload: DashboardTransactionNavigationPayload,
  ) => {
    setTransactionsPrefetch(payload.prefetchedTransactions || []);
    setTransactionsPrefillFilter(payload.prefillFilter || null);
    navigateTo("transactions");
  };

  return (
    <PrivateRoute>
      <div id="root">
        <AppRouter
          context={{
            transactionsPrefetch,
            transactionsPrefillFilter,
            onOpenTransactionsFromDashboard: handleOpenTransactionsFromDashboard,
          }}
        />
        <NotificationCenter />
      </div>
    </PrivateRoute>
  );
}
