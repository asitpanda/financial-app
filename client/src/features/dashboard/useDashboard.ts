import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '../../store/notificationStore';
import { getCategories } from '../categories/categories.api';
import { getFinancialAccounts } from '../accounts/financialAccounts.api';
import { getGoals } from '../goals/goals.api';
import { getInvestmentAssetTaxonomy } from '../investments/api/investmentAssetTaxonomy.api';
import { getInvestments } from '../investments/api/investments.api';
import { getTransactions } from '../transactions/transactions.api';

const loadDashboardPageData = async () => {
  const [transactions, goals, categories, accounts, investments, taxonomyNodes] = await Promise.all([
    getTransactions(),
    getGoals(),
    getCategories(),
    getFinancialAccounts(),
    getInvestments(),
    getInvestmentAssetTaxonomy(),
  ]);

  return {
    transactions: Array.isArray(transactions) ? transactions : [],
    goals: Array.isArray(goals) ? goals : [],
    categories: Array.isArray(categories) ? categories : [],
    accounts: Array.isArray(accounts) ? accounts : [],
    investments: Array.isArray(investments) ? investments : [],
    taxonomyNodes: Array.isArray(taxonomyNodes) ? taxonomyNodes : [],
  };
};

export const useDashboard = () => {
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const query = useQuery({
    queryKey: ['dashboard', 'page-data'],
    queryFn: () => loadDashboardPageData(),
  });

  useEffect(() => {
    if (!query.error) return;
    pushNotification({ type: 'error', message: 'Failed to load dashboard' });
  }, [query.error, pushNotification]);

  return {
    ...query,
    data: query.data,
    loading: query.isLoading,
    error: query.error,
    reload: query.refetch,
  };
};
