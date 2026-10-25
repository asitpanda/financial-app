import { describe, expect, it } from 'vitest';
import { buildPage, getListOffset } from './listing.utils';

describe('listing.utils', () => {
  describe('getListOffset', () => {
    it('returns the number of records preceding the requested page', () => {
      expect(getListOffset({ page: 3, limit: 25 })).toBe(50);
    });

    it('returns zero for the first page', () => {
      expect(getListOffset({ page: 1, limit: 25 })).toBe(0);
    });
  });

  describe('buildPage', () => {
    it('returns the items and pagination metadata when another page exists', () => {
      const items = [{ id: 1 }, { id: 2 }];

      expect(buildPage({ items, total: 5 }, { page: 1, limit: 2 })).toEqual({
        data: items,
        pagination: {
          page: 1,
          limit: 2,
          total: 5,
          totalPages: 3,
          hasNextPage: true,
        },
      });
    });

    it('does not report a next page when the result ends on the requested page', () => {
      expect(buildPage({ items: [{ id: 3 }], total: 3 }, { page: 2, limit: 2 }).pagination)
        .toEqual({ page: 2, limit: 2, total: 3, totalPages: 2, hasNextPage: false });
    });

    it('returns zero pages for an empty result', () => {
      expect(buildPage({ items: [], total: 0 }, { page: 1, limit: 25 }).pagination).toEqual({
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      });
    });
  });
});