import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  confirmRecurringContributionPlan,
  recordInvestmentContribution,
  skipCurrentContributionPlan,
  updateContributionPlan,
} from '../api/contributionPlans.api';

const invalidateInvestmentContributionQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  investmentId: string | number,
) => {
  queryClient.invalidateQueries({ queryKey: ['investments'] });
  queryClient.invalidateQueries({ queryKey: ['investments', 'dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['investment-events'] });
  queryClient.invalidateQueries({ queryKey: ['investment-events', investmentId] });
  queryClient.invalidateQueries({ queryKey: ['investment', investmentId] });
  queryClient.invalidateQueries({ queryKey: ['investment', investmentId, 'performance'] });
};

export const useUpdateInvestmentContributionPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      planId,
      payload,
    }: {
      investmentId: string | number;
      planId: string | number;
      payload: Record<string, unknown>;
    }) => updateContributionPlan(investmentId, planId, payload),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investments', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['investment', variables.investmentId] });
    },
  });
};

export const useRecordInvestmentContribution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown> & { investmentId: string | number }) =>
      recordInvestmentContribution(payload),
    onSuccess: (_result, variables) => {
      invalidateInvestmentContributionQueries(queryClient, variables.investmentId);
    },
  });
};

export const useSkipCurrentInvestmentContribution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      planId,
      payload,
    }: {
      investmentId: string | number;
      planId: string | number;
      payload?: Record<string, unknown>;
    }) => skipCurrentContributionPlan(investmentId, planId, payload),
    onSuccess: (_result, variables) => {
      invalidateInvestmentContributionQueries(queryClient, variables.investmentId);
    },
  });
};

export const useConfirmRecurringInvestmentContributionPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      payload,
    }: {
      investmentId: string | number;
      payload: Record<string, unknown>;
    }) => confirmRecurringContributionPlan(investmentId, payload),
    onSuccess: (_result, variables) => {
      invalidateInvestmentContributionQueries(queryClient, variables.investmentId);
    },
  });
};