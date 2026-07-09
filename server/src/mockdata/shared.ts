export const MOCK_SEED_DATE = new Date('2026-01-01');

export const dateFromBaseDate = (baseDate: Date, offsetDays: number) =>
  new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offsetDays);

export const withAuditFields = <T extends object>(record: T, userId: number, date = MOCK_SEED_DATE) => ({
  ...record,
  userId,
  createdAt: date,
  updatedAt: date,
});