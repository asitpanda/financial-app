import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import investmentAssetTaxonomyApi from '../api/investmentAssetTaxonomy.api';
import {
  removeInvestmentAssetTaxonomy,
  saveInvestmentAssetTaxonomy,
  type InvestmentAssetTaxonomySavePayload,
} from '../service/investmentAssetTaxonomy.service';

export const useInvestmentAssetTaxonomy = () => {
  return useQuery({
    queryKey: ['investment-taxonomy'],
    queryFn: () => investmentAssetTaxonomyApi.getAll(),
  });
};

export const useSaveInvestmentAssetTaxonomy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InvestmentAssetTaxonomySavePayload) =>
      saveInvestmentAssetTaxonomy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-taxonomy'] });
      queryClient.invalidateQueries({ queryKey: ['investments', 'page-data'] });
    },
  });
};

export const useRemoveInvestmentAssetTaxonomy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => removeInvestmentAssetTaxonomy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-taxonomy'] });
      queryClient.invalidateQueries({ queryKey: ['investments', 'page-data'] });
    },
  });
};
