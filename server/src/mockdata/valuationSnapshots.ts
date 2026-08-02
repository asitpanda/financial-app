import { dateFromBaseDate } from './shared';
import type { ValuationSnapshotRecord } from './types';

const baseDate = new Date();

// Helper to generate 60-month SIP data for testing large datasets
// Generates snapshots from investment start date to today
const generateSIPData = (investmentId: number, userId: number, startId: number, investmentStartDate: Date, totalInvestedAmount: number, targetFinalValue: number) => {
  const snapshots = [];
  let currentId = startId;
  const monthlyContribution = totalInvestedAmount / 60; // Divide total invested by 60 months
  
  // Calculate days from investment start to today
  const today = baseDate;
  const totalDaysSpan = (today.getTime() - investmentStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysBetweenSnapshots = totalDaysSpan / 59; // Divide span into 60 equal intervals
  
  // Generate 60 monthly snapshots from investment start date to today
  for (let monthIndex = 0; monthIndex < 60; monthIndex++) {
    const daysFromStart = monthIndex * daysBetweenSnapshots;
    const snapshotDate = new Date(investmentStartDate.getTime() + daysFromStart * 1000 * 60 * 60 * 24);
    
    // Cumulative contribution: grows with each month
    const totalContributed = (monthIndex + 1) * monthlyContribution;
    
    // Realistic market growth pattern with some volatility
    // Scale to reach targetFinalValue at the end (monthIndex = 59)
    const baseGrowth = totalContributed * 1.09; // 9% average annual growth
    const volatility = Math.sin(monthIndex / 10) * totalContributed * 0.05; // Market fluctuations
    let marketValue = Math.round(baseGrowth + volatility);
    
    // For the final snapshot (monthIndex = 59), use the target final value to match investment.currentValue
    if (monthIndex === 59) {
      marketValue = targetFinalValue;
    }
    
    // Calculate NAV and units - starts at 85, gradually appreciates
    const nav = 85 + (monthIndex * 0.15);
    const totalUnits = marketValue / nav;
    
    snapshots.push({
      id: currentId++,
      userId,
      investmentId,
      snapshotDate: snapshotDate,
      marketValue,
      units: Math.round(totalUnits * 100) / 100,
      price: Math.round(nav * 100) / 100,
      source: 'manual' as const,
      createdAt: snapshotDate,
    });
  }
  
  return { snapshots, nextId: currentId };
};

// Investment 1 started: April 21, 2023
const investment1StartDate = new Date(2023, 3, 21); // Month is 0-indexed, so 3 = April
// totalInvested: 420000, currentValue: 458000
const { snapshots: sipData, nextId: nextIdAfterSIP } = generateSIPData(1, 1, 1, investment1StartDate, 420000, 458000);

export const mockValuationSnapshotsData: ValuationSnapshotRecord[] = [
  // Investment 1: Axis Bluechip SIP - 60 MONTHS OF DATA (test for scalability)
  ...sipData,

  // Investment 2: HDFC Bank Shares - growth data
  {
    id: nextIdAfterSIP,
    userId: 1,
    investmentId: 2,
    snapshotDate: dateFromBaseDate(baseDate, -200),
    marketValue: 265000,
    units: 350,
    price: 757.14,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -200),
  },
  {
    id: nextIdAfterSIP + 1,
    userId: 1,
    investmentId: 2,
    snapshotDate: dateFromBaseDate(baseDate, -100),
    marketValue: 288000,
    units: 350,
    price: 822.86,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -100),
  },
  {
    id: nextIdAfterSIP + 2,
    userId: 1,
    investmentId: 2,
    snapshotDate: dateFromBaseDate(baseDate, -10),
    marketValue: 301000,
    units: 350,
    price: 860,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -10),
  },

  // Investment 4: PPF Account - cumulative growth
  {
    id: nextIdAfterSIP + 3,
    userId: 1,
    investmentId: 4,
    snapshotDate: dateFromBaseDate(baseDate, -365),
    marketValue: 980000,
    units: null,
    price: null,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -365),
  },
  {
    id: nextIdAfterSIP + 4,
    userId: 1,
    investmentId: 4,
    snapshotDate: dateFromBaseDate(baseDate, -180),
    marketValue: 1030000,
    units: null,
    price: null,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -180),
  },
  {
    id: nextIdAfterSIP + 5,
    userId: 1,
    investmentId: 4,
    snapshotDate: dateFromBaseDate(baseDate, -90),
    marketValue: 1075000,
    units: null,
    price: null,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -90),
  },
  {
    id: nextIdAfterSIP + 6,
    userId: 1,
    investmentId: 4,
    snapshotDate: dateFromBaseDate(baseDate, -7),
    marketValue: 1120000,
    units: null,
    price: null,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -7),
  },

  // Investment 3: SBI Flexi FD - steady growth with interest
  {
    id: nextIdAfterSIP + 7,
    userId: 1,
    investmentId: 3,
    snapshotDate: dateFromBaseDate(baseDate, -200),
    marketValue: 520000,
    units: null,
    price: null,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -200),
  },
  {
    id: nextIdAfterSIP + 8,
    userId: 1,
    investmentId: 3,
    snapshotDate: dateFromBaseDate(baseDate, -100),
    marketValue: 533000,
    units: null,
    price: null,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -100),
  },
  {
    id: nextIdAfterSIP + 9,
    userId: 1,
    investmentId: 3,
    snapshotDate: dateFromBaseDate(baseDate, -20),
    marketValue: 548500,
    units: null,
    price: null,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -20),
  },

  // Investment 7: Physical Gold Coins - market appreciation
  {
    id: nextIdAfterSIP + 10,
    userId: 1,
    investmentId: 7,
    snapshotDate: dateFromBaseDate(baseDate, -150),
    marketValue: 198000,
    units: null,
    price: null,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -150),
  },
  {
    id: nextIdAfterSIP + 11,
    userId: 1,
    investmentId: 7,
    snapshotDate: dateFromBaseDate(baseDate, -75),
    marketValue: 206000,
    units: null,
    price: null,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -75),
  },
  {
    id: nextIdAfterSIP + 12,
    userId: 1,
    investmentId: 7,
    snapshotDate: dateFromBaseDate(baseDate, -5),
    marketValue: 213000,
    units: null,
    price: null,
    source: 'manual',
    createdAt: dateFromBaseDate(baseDate, -5),
  },
];