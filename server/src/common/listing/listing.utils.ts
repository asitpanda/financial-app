import type { ListQuery, ListResult, Page } from './listing.types';

export const getListOffset = ({ page, limit }: ListQuery): number => (page - 1) * limit;

export const buildPage = <T>(result: ListResult<T>, query: ListQuery): Page<T> => {
  const totalPages = result.total === 0 ? 0 : Math.ceil(result.total / query.limit);

  return {
    data: result.items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages,
      hasNextPage: query.page < totalPages,
    },
  };
};