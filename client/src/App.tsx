import { useState, useEffect } from "react";
import { Alert, Button, CircularProgress, Box } from "@mui/material";
import PrivateRoute from "./features/auth/components/PrivateRoute";
import IdleTimeoutGuard from "./features/auth/components/IdleTimeoutGuard";
import AppRouter from "./routing/AppRouter";
import { authApi } from "./features/auth/auth.api";
import { useAuth } from "./features/auth/useAuth";
import { usePreferencesStore } from "./store/preferencesStore";
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
  const { token, isAuthenticated, loading, setLoading, setUser } =
    useAuth();
  const preferencesReady = usePreferencesStore((state) => state.preferences !== null);
  const [bootstrapError, setBootstrapError] = useState(false);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [transactionsPrefetch, setTransactionsPrefetch] = useState<TransactionRecord[]>([]);
  const [transactionsPrefillFilter, setTransactionsPrefillFilter] = useState<
    TransactionsPrefillFilter | null
  >(null);

  useEffect(() => {
    if (!token || preferencesReady) return;
    const controller = new AbortController();
    const sessionId = usePreferencesStore.getState().sessionId;
    const initAuth = async () => {
      setLoading(true);
      setBootstrapError(false);
      try {
        const { preferences, ...user } = await authApi.getMe(controller.signal);
        if (controller.signal.aborted || useAuth.getState().token !== token ||
            usePreferencesStore.getState().sessionId !== sessionId) return;
        if (!preferences) throw new Error("User preferences are unavailable");
        setUser(user);
        setLoading(false);
        usePreferencesStore.getState().setPreferences(sessionId, preferences);
      } catch {
        if (!controller.signal.aborted && useAuth.getState().token === token &&
            usePreferencesStore.getState().sessionId === sessionId) {
          setBootstrapError(true);
          setLoading(false);
        }
      }
    };

    void initAuth();
    return () => controller.abort();
  }, [token, preferencesReady, bootstrapAttempt, setLoading, setUser]);

  useEffect(() => {
    if (isAuthenticated) return;
    setTransactionsPrefetch([]);
    setTransactionsPrefillFilter(null);
  }, [isAuthenticated]);

  if (token && !preferencesReady && bootstrapError) {
    return (
      <Box sx={{ maxWidth: 480, mx: "auto", p: 3 }}>
        <Alert severity="error">Unable to load your preferences.</Alert>
        <Button onClick={() => setBootstrapAttempt((attempt) => attempt + 1)}>Retry</Button>
        <Button onClick={() => useAuth.getState().logout()}>Sign out</Button>
      </Box>
    );
  }

  if (loading || (token && !preferencesReady)) {
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
        <IdleTimeoutGuard />
      </div>
    </PrivateRoute>
  );
}
