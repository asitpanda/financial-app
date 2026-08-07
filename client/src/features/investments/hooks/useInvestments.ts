import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFinancialAccounts } from '../../accounts/financialAccounts.api';
import investmentApi from '../api/investments.api';
import investmentEventsApi from '../api/investmentEvents.api';
import investmentAssetTaxonomyApi from '../api/investmentAssetTaxonomy.api';
import { useNotificationStore } from '../../../store/notificationStore';
import { removeInvestment, saveInvestment } from '../service/investments.service';
import type {
  CreateInvestmentDto,
  Investment,
  InvestmentEvent,
  UpdateInvestmentDto,
} from '../types/investment.types';
import type { InvestmentAssetTaxonomyNode } from '../types/investmentAssetTaxonomy.types';

interface FinancialAccountRecord {
  id: number | string;
  name?: string;
  displayName?: string;
  institutionName?: string;
}

interface InvestmentPageData {
  investments: Investment[];
  investmentEvents: InvestmentEvent[];
  taxonomyNodes: InvestmentAssetTaxonomyNode[];
  accounts: FinancialAccountRecord[];
}

export const useInvestments = () => {
  return useQuery({
    queryKey: ['investments'],
    queryFn: () => investmentApi.getAll(),
  });
};

export const useInvestment = (id: string | number) => {
  return useQuery({
    queryKey: ['investment', id],
    queryFn: () => investmentApi.getById(id),
    enabled: Boolean(id),
  });
};

export const useCreateInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvestmentDto) => investmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investments', 'page-data'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investments', 'page-data'] });
    },
  });
};

export const useDeleteInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => investmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investments', 'page-data'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investments', 'page-data'] });
    },
  });
};

export const useRemoveInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => removeInvestment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investments', 'page-data'] });
    },
  });
};

export const useInvestmentPageData = () => {
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const query = useQuery<InvestmentPageData>({
    queryKey: ['investments', 'page-data'],
    queryFn: async () => {
      const [investments, taxonomyNodes, accounts] = await Promise.all([
        investmentApi.getAll(),
        investmentAssetTaxonomyApi.getAll(),
        getFinancialAccounts(),
      ]);

      const normalizedInvestments = Array.isArray(investments) ? investments : [];
      const eventGroups = await Promise.all(
        normalizedInvestments.map((investment) =>
          investmentEventsApi
            .getByInvestmentId(investment.id)
            .catch(() => [] as InvestmentEvent[]),
        ),
      );

      return {
        investments: normalizedInvestments,
        investmentEvents: eventGroups.flat(),
        taxonomyNodes: Array.isArray(taxonomyNodes) ? taxonomyNodes : [],
        accounts: Array.isArray(accounts) ? accounts : [],
      };
    },
  });

  useEffect(() => {
    if (!query.error) return;
    pushNotification({ type: 'error', message: 'Failed to load investments' });
  }, [query.error, pushNotification]);

  return {
    investments: query.data?.investments || [],
    investmentEvents: query.data?.investmentEvents || [],
    taxonomyNodes: query.data?.taxonomyNodes || [],
    accounts: query.data?.accounts || [],
    loading: query.isLoading,
    error: query.error,
    reload: query.refetch,
  };
};
