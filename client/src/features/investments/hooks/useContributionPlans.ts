import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  confirmRecurringContributionPlan,
  recordInvestmentContribution,
  recordInvestmentWithdrawal,
  skipCurrentContributionPlan,
  updateContributionPlan,
} from '../api/contributionPlans.api';
import {
  createInvestmentEvent,
  deleteInvestmentEvent,
  updateInvestmentEvent,
} from '../api/investmentEvents.api';

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

export const useRecordInvestmentWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown> & { investmentId: string | number }) =>
      recordInvestmentWithdrawal(payload),
    onSuccess: (_result, variables) => {
      invalidateInvestmentContributionQueries(queryClient, variables.investmentId);
    },
  });
};

export const useRecordInvestmentIncomeCredit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      payload,
    }: {
      investmentId: string | number;
      payload: Record<string, unknown>;
    }) => createInvestmentEvent(investmentId, payload),
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

export const useUpdateInvestmentEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      eventId,
      payload,
    }: {
      investmentId: string | number;
      eventId: string | number;
      payload: Record<string, unknown>;
    }) => updateInvestmentEvent(investmentId, eventId, payload),
    onSuccess: (_result, variables) => {
      invalidateInvestmentContributionQueries(queryClient, variables.investmentId);
    },
  });
};

export const useDeleteInvestmentEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      eventId,
    }: {
      investmentId: string | number;
      eventId: string | number;
    }) => deleteInvestmentEvent(investmentId, eventId),
    onSuccess: (_result, variables) => {
      invalidateInvestmentContributionQueries(queryClient, variables.investmentId);
    },
  });
};