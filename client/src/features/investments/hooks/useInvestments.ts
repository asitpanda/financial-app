import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFinancialAccounts } from '../../accounts/financialAccounts.api';
import type { FinancialAccountRecord } from '../../accounts/types/account.types';
import investmentEventsApi from '../api/investmentEvents.api';
import investmentApi from '../api/investments.api';
import investmentAssetTaxonomyApi from '../api/investmentAssetTaxonomy.api';
import valuationSnapshotsApi from '../api/valuationSnapshots.api';
import { useNotificationStore } from '../../../store/notificationStore';
import { removeInvestment, saveInvestment } from '../service/investments.service';
import type {
  CreateInvestmentDto,
  InvestmentDashboardAnalyticsResponse,
  UpdateInvestmentDto,
} from '../types/investment.types';
import type { InvestmentAssetTaxonomyNode } from '../types/investmentAssetTaxonomy.types';

interface InvestmentReferenceData {
  taxonomyNodes: InvestmentAssetTaxonomyNode[];
  accounts: FinancialAccountRecord[];
}

const invalidateInvestmentSummaryQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['investments'] });
  queryClient.invalidateQueries({ queryKey: ['investments', 'dashboard'] });
};

const invalidateInvestmentDetailQuery = (
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string | number | null,
) => {
  if (id == null || id === '') return;
  queryClient.invalidateQueries({ queryKey: ['investment', id] });
};

export const useInvestmentSummaryData = () => {
  return useQuery({
    queryKey: ['investments'],
    queryFn: () => investmentApi.getAll(),
  });
};

export const useInvestments = () => useInvestmentSummaryData();

export const useInvestment = (id: string | number) => {
  return useQuery({
    queryKey: ['investment', id],
    queryFn: () => investmentApi.getById(id),
    enabled: Boolean(id),
  });
};

export const useInvestmentPerformance = (id: string | number, enabled = true) => {
  return useQuery({
    queryKey: ['investment', id, 'performance'],
    queryFn: () => investmentApi.getPerformanceById(id),
    enabled: Boolean(id) && enabled,
  });
};

export const useInvestmentEventsData = (enabled = true) => {
  return useQuery({
    queryKey: ['investment-events'],
    queryFn: () => investmentEventsApi.getAll(),
    enabled,
  });
};

export const useInvestmentEventsByInvestment = (
  investmentId: string | number,
  enabled = true,
) => {
  return useQuery({
    queryKey: ['investment-events', investmentId],
    queryFn: () => investmentEventsApi.getByInvestmentId(investmentId),
    enabled: Boolean(investmentId) && enabled,
  });
};

export const useInvestmentSnapshotsByInvestment = (
  investmentId: string | number,
  enabled = true,
) => {
  return useQuery({
    queryKey: ['investment-snapshots', investmentId],
    queryFn: () => valuationSnapshotsApi.getByInvestment(investmentId),
    enabled: Boolean(investmentId) && enabled,
  });
};

export const useInvestmentDashboardAnalytics = (enabled = true) => {
  return useQuery<InvestmentDashboardAnalyticsResponse>({
    queryKey: ['investments', 'dashboard'],
    queryFn: () => investmentApi.getDashboardAnalytics(),
    enabled,
  });
};

export const useInvestmentReferenceData = () => {
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const query = useQuery<InvestmentReferenceData>({
    queryKey: ['investments', 'reference-data'],
    queryFn: async () => {
      const [taxonomyNodes, accounts] = await Promise.all([
        investmentAssetTaxonomyApi.getAll(),
        getFinancialAccounts(),
      ]);

      return {
        taxonomyNodes: Array.isArray(taxonomyNodes) ? taxonomyNodes : [],
        accounts: Array.isArray(accounts) ? accounts : [],
      };
    },
  });

  useEffect(() => {
    if (!query.error) return;
    pushNotification({ type: 'error', message: 'Failed to load investment reference data' });
  }, [query.error, pushNotification]);

  return {
    taxonomyNodes: query.data?.taxonomyNodes || [],
    accounts: query.data?.accounts || [],
    loading: query.isLoading,
    error: query.error,
    reload: query.refetch,
  };
};

export const useCreateInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvestmentDto) => investmentApi.create(data),
    onSuccess: (savedInvestment) => {
      invalidateInvestmentSummaryQueries(queryClient);
      invalidateInvestmentDetailQuery(queryClient, savedInvestment?.id);
    },
  });
};

export const useUpdateInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string | number;
      data: UpdateInvestmentDto;
    }) => investmentApi.update(id, data),
    onSuccess: (_savedInvestment, variables) => {
      invalidateInvestmentSummaryQueries(queryClient);
      invalidateInvestmentDetailQuery(queryClient, variables.id);
    },
  });
};

export const useDeleteInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => investmentApi.delete(id),
    onSuccess: (_result, id) => {
      invalidateInvestmentSummaryQueries(queryClient);
      queryClient.removeQueries({ queryKey: ['investment', id], exact: true });
    },
  });
};

export const useSaveInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      selectedInvestmentId,
    }: {
      payload: CreateInvestmentDto;
      selectedInvestmentId?: string | number | null;
    }) => saveInvestment({ payload, selectedInvestmentId }),
    onSuccess: (savedInvestment, variables) => {
      invalidateInvestmentSummaryQueries(queryClient);
      invalidateInvestmentDetailQuery(
        queryClient,
        variables.selectedInvestmentId ?? savedInvestment?.id,
      );
    },
  });
};

export const useRemoveInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => removeInvestment(id),
    onSuccess: (_result, id) => {
      invalidateInvestmentSummaryQueries(queryClient);
      queryClient.removeQueries({ queryKey: ['investment', id], exact: true });
    },
  });
};

export const useInvestmentSummaryPageData = () => {
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const query = useInvestmentSummaryData();

  useEffect(() => {
    if (!query.error) return;
    pushNotification({ type: 'error', message: 'Failed to load investments' });
  }, [query.error, pushNotification]);

  return {
    investments: Array.isArray(query.data) ? query.data : [],
    loading: query.isLoading,
    error: query.error,
    reload: query.refetch,
  };
};

export const useInvestmentPageData = () => useInvestmentSummaryPageData();
