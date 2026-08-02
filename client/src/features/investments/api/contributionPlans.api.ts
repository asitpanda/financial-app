import apiClient from '../../../api/client';

export const previewRecurringContributionPlan = async (
  investmentId: string | number,
  payload: Record<string, unknown>,
) => {
  const response = await apiClient.post(
    `/investments/${investmentId}/contribution-plans/preview`,
    payload,
  );
  return response.data;
};

export const confirmRecurringContributionPlan = async (
  investmentId: string | number,
  payload: Record<string, unknown>,
) => {
  const response = await apiClient.post(
    `/investments/${investmentId}/contribution-plans/confirm`,
    payload,
  );
  return response.data;
};

export const updateContributionPlan = async (
  investmentId: string | number,
  planId: string | number,
  payload: Record<string, unknown>,
) => {
  const response = await apiClient.patch(
    `/investments/${investmentId}/contribution-plans/${planId}`,
    payload,
  );
  return response.data;
};

const contributionPlansApi = {
  previewRecurringContributionPlan,
  confirmRecurringContributionPlan,
  updateContributionPlan,
};

export default contributionPlansApi;
