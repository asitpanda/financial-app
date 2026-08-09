export type ValuationSnapshotRecord = {
  id: number;
  userId: number;
  investmentId: number;
  snapshotDate: Date;
  marketValue: number;
  units: number | null;
  price: number | null;
  source: string | null;
  createdAt: Date;
};
