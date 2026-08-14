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
  const [transactionsResult, goalsResult, categoriesResult, accountsResult, investmentsResult, taxonomyNodesResult] = await Promise.allSettled([
    getTransactions(),
    getGoals(),
    getCategories(),
    getFinancialAccounts(),
    getInvestments(),
    getInvestmentAssetTaxonomy(),
  ]);

  const transactions =
    transactionsResult.status === 'fulfilled' ? transactionsResult.value : [];
  const goals = goalsResult.status === 'fulfilled' ? goalsResult.value : [];
  const categories =
    categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const accounts =
    accountsResult.status === 'fulfilled' ? accountsResult.value : [];
  const investments =
    investmentsResult.status === 'fulfilled' ? investmentsResult.value : [];
  const taxonomyNodes =
    taxonomyNodesResult.status === 'fulfilled' ? taxonomyNodesResult.value : [];

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
