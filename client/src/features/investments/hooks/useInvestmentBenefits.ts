import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import investmentBenefitsApi, {
  type InvestmentBenefitPayload,
  type RealizeInvestmentBenefitPayload,
  type QuickRealizeInvestmentBenefitPayload,
} from '../api/investmentBenefits.api';

const invalidateBenefitQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  investmentId: string | number,
) => {
  queryClient.invalidateQueries({ queryKey: ['investment-benefits'] });
  queryClient.invalidateQueries({ queryKey: ['investment-benefits', investmentId] });
  queryClient.invalidateQueries({ queryKey: ['investments'], exact: true });
  queryClient.invalidateQueries({ queryKey: ['investments', 'dashboard'], exact: true });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['investment', investmentId] });
  queryClient.invalidateQueries({ queryKey: ['investment', investmentId, 'performance'] });
  queryClient.invalidateQueries({ queryKey: ['investment-events'] });
  queryClient.invalidateQueries({ queryKey: ['investment-events', investmentId] });
};

export const useInvestmentBenefits = (enabled = true) =>
  useQuery({
    queryKey: ['investment-benefits'],
    queryFn: investmentBenefitsApi.getAll,
    enabled,
  });

export const useInvestmentBenefitsByInvestment = (
  investmentId: string | number,
  enabled = true,
) =>
  useQuery({
    queryKey: ['investment-benefits', investmentId],
    queryFn: () => investmentBenefitsApi.getByInvestmentId(investmentId),
    enabled: Boolean(investmentId) && enabled,
  });

export const useInvestmentBenefit = (
  investmentId: string | number,
  benefitId: string | number,
  enabled = true,
) =>
  useQuery({
    queryKey: ['investment-benefits', investmentId, benefitId],
    queryFn: () => investmentBenefitsApi.getById(investmentId, benefitId),
    enabled: Boolean(investmentId) && Boolean(benefitId) && enabled,
  });

export const useCreateInvestmentBenefit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      payload,
    }: {
      investmentId: string | number;
      payload: InvestmentBenefitPayload;
    }) => investmentBenefitsApi.create(investmentId, payload),
    onSuccess: (_result, variables) => invalidateBenefitQueries(queryClient, variables.investmentId),
  });
};

export const useUpdateInvestmentBenefit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      benefitId,
      payload,
    }: {
      investmentId: string | number;
      benefitId: string | number;
      payload: Partial<InvestmentBenefitPayload>;
    }) => investmentBenefitsApi.update(investmentId, benefitId, payload),
    onSuccess: (_result, variables) => invalidateBenefitQueries(queryClient, variables.investmentId),
  });
};

export const useDeleteInvestmentBenefit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      benefitId,
    }: {
      investmentId: string | number;
      benefitId: string | number;
    }) => investmentBenefitsApi.delete(investmentId, benefitId),
    onSuccess: (_result, variables) => invalidateBenefitQueries(queryClient, variables.investmentId),
  });
};

export const useRealizeInvestmentBenefit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      benefitId,
      payload,
    }: {
      investmentId: string | number;
      benefitId: string | number;
      payload: RealizeInvestmentBenefitPayload;
    }) => investmentBenefitsApi.realize(investmentId, benefitId, payload),
    onSuccess: (_result, variables) => invalidateBenefitQueries(queryClient, variables.investmentId),
  });
};

export const useQuickRealizeInvestmentBenefit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      payload,
    }: {
      investmentId: string | number;
      payload: QuickRealizeInvestmentBenefitPayload;
    }) => investmentBenefitsApi.quickRealize(investmentId, payload),
    onSuccess: (_result, variables) => invalidateBenefitQueries(queryClient, variables.investmentId),
  });
};