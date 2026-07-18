import React, { useState, useEffect } from 'react';
import { CircularProgress, Box } from '@mui/material';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Goals from './pages/Goals';
import Categories from './pages/Categories';
import Investments from './pages/Investments';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './layout/AppLayout';
import { authApi } from './api/auth';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { navigateTo } from './services/navigation';
import { NotificationCenter } from './components/common';
import './App.css';

const TransactionsPage = Transactions as any;

export default function App() {
  const { token, user, loading, setLoading, setUser, logout } = useAuthStore();
  const activeScreen = useAppStore((state) => state.activeScreen);
  const [transactionsPrefetch, setTransactionsPrefetch] = useState<any[]>([]);
  const [transactionsPrefillFilter, setTransactionsPrefillFilter] = useState<any | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      if (token && !user) {
        setLoading(true);
        try {
          const user = await authApi.getMe();
          setUser(user);
        } catch (error) {
          console.warn('Token validation failed during bootstrap:', error);
          logout();
        } finally {
          setLoading(false);
        }
      }
    };

    initAuth();
  }, [token, user, setLoading, setUser, logout]);

  // Show loading spinner while validating token
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  const handleOpenTransactionsFromDashboard = (payload: {
    prefetchedTransactions: any[];
    prefillFilter: any;
  }) => {
    setTransactionsPrefetch(payload.prefetchedTransactions || []);
    setTransactionsPrefillFilter(payload.prefillFilter || null);
    navigateTo('transactions');
  };

  let content: React.ReactNode = null;
  if (activeScreen === 'dashboard') {
    content = <Dashboard onOpenTransactionsFromDashboard={handleOpenTransactionsFromDashboard} />;
  } else if (activeScreen === 'transactions') {
    content = (
      <TransactionsPage
        prefetchedTransactions={transactionsPrefetch as any}
        prefillFilter={transactionsPrefillFilter}
      />
    );
  }
  else if (activeScreen === 'goals') content = <Goals />;
  else if (activeScreen === 'categories') content = <Categories />;
  else if (activeScreen === 'investments') content = <Investments />;

  return (
    <PrivateRoute>
      <div id="root">
        <AppLayout activeScreen={activeScreen} onNavigate={navigateTo}>
          {content}
        </AppLayout>
        <NotificationCenter />
      </div>
    </PrivateRoute>
  );
}
