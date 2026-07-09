import { dateFromBaseDate } from './shared';
import type { MockValuationSnapshot } from './types';

const baseDate = new Date();

export const mockValuationSnapshotsData: MockValuationSnapshot[] = [
  {
    id: 1,
    userId: 1,
    investmentId: 1,
    snapshotDate: dateFromBaseDate(baseDate, -2),
    marketValue: 458000,
    units: 5388.43,
    price: 84.99,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -2),
  },
  {
    id: 2,
    userId: 1,
    investmentId: 4,
    snapshotDate: dateFromBaseDate(baseDate, -7),
    marketValue: 1120000,
    units: null,
    price: null,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -7),
  },
];