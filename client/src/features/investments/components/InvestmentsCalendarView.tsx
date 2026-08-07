import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  alpha,
  Box,
  Divider,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AppButton from '../../../components/common/AppButton';
import { SectionCard } from '../../../components/common';
import { formatInvestmentCurrency } from '../../../utils/investmentHelpers';
import type { Investment, InvestmentEvent } from '../types/investment.types';
import type {
  InvestmentCalendarItem,
  InvestmentCalendarGroups,
} from '../investments.selectors';

interface InvestmentsCalendarViewProps {
  calendarGroups: InvestmentCalendarGroups;
  investmentEvents: InvestmentEvent[];
  investments: Investment[];
  categoryLabelMap: Record<string, string>;
}

type HeatmapMetric = 'amount' | 'count' | 'profitLoss';
type HeatmapViewMode = 'month' | 'year';

interface BucketCell {
  amount: number;
  count: number;
  scheduledCount: number;
  actualCount: number;
  profitLoss: number;
}

interface BucketRow {
  key: string;
  label: string;
  investmentIds: string[];
  monthCells: Record<string, BucketCell>;
  yearCells: Record<string, BucketCell>;
}

interface PeriodDescriptor {
  key: string;
  label: string;
  year: number;
  monthIndex?: number;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const EMPTY_CELL: BucketCell = {
  amount: 0,
  count: 0,
  scheduledCount: 0,
  actualCount: 0,
  profitLoss: 0,
};

const INACTIVE_EVENT_STATUSES = new Set(['SKIPPED', 'FAILED', 'CANCELLED']);

const cloneEmptyCell = (): BucketCell => ({ ...EMPTY_CELL });

const getMonthKey = (year: number, monthIndex: number) => `${year}-${monthIndex}`;

const getYearKey = (year: number) => String(year);

const isCountableEvent = (event: InvestmentEvent) => {
  return !INACTIVE_EVENT_STATUSES.has(String(event.status || '').toUpperCase());
};

const getMetricValue = (cell: BucketCell, metric: HeatmapMetric) => {
  if (metric === 'count') return cell.count;
  if (metric === 'profitLoss') return cell.profitLoss;
  return cell.amount;
};

const getMetricDescription = (metric: HeatmapMetric) => {
  if (metric === 'count') {
    return 'Actual events for past/current periods, scheduled items for future periods.';
  }

  if (metric === 'profitLoss') {
    return 'Valuation by period-end versus invested amount adjusted for actual and scheduled contributions.';
  }

  return 'Actual contribution amounts for past/current periods, scheduled amounts for future periods.';
};

const formatCompactCurrency = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${Math.round(value / 1000)}K`;
  return formatInvestmentCurrency(value);
};

const formatCompactMetric = (value: number, metric: HeatmapMetric) => {
  if (metric === 'count') {
    return value > 0 ? String(value) : '-';
  }

  if (metric === 'profitLoss') {
    if (value === 0) return '-';
    return `${value > 0 ? '+' : '-'}${formatCompactCurrency(Math.abs(value))}`;
  }

  if (value <= 0) return '-';
  return formatCompactCurrency(value);
};

const getCellColor = (
  value: number,
  maxValue: number,
  metric: HeatmapMetric,
  isEmpty: boolean,
) => {
  if (isEmpty || maxValue <= 0) {
    return {
      backgroundColor: 'transparent',
      borderColor: alpha('#94a3b8', 0.18),
      textColor: 'text.secondary',
    };
  }

  if (metric === 'profitLoss') {
    const ratio = Math.max(0, Math.min(Math.abs(value) / maxValue, 1));

    if (value < 0) {
      const palette = ['#fff1f2', '#fecdd3', '#fb7185', '#be123c'];
      const shadeIndex = Math.min(
        palette.length - 1,
        Math.floor(ratio * palette.length),
      );

      return {
        backgroundColor: palette[shadeIndex],
        borderColor: alpha(palette[shadeIndex], 0.65),
        textColor: shadeIndex >= 2 ? 'common.white' : 'text.primary',
      };
    }

    const palette = ['#ecfdf5', '#bbf7d0', '#4ade80', '#15803d'];
    const shadeIndex = Math.min(
      palette.length - 1,
      Math.floor(ratio * palette.length),
    );

    return {
      backgroundColor: palette[shadeIndex],
      borderColor: alpha(palette[shadeIndex], 0.65),
      textColor: shadeIndex >= 2 ? 'common.white' : 'text.primary',
    };
  }

  const ratio = Math.max(0, Math.min(value / maxValue, 1));
  const palette =
    metric === 'count'
      ? ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb']
      : ['#ecfeff', '#99f6e4', '#2dd4bf', '#0f766e'];
  const shadeIndex = Math.min(
    palette.length - 1,
    Math.floor(ratio * palette.length),
  );

  return {
    backgroundColor: palette[shadeIndex],
    borderColor: alpha(palette[shadeIndex], 0.55),
    textColor: shadeIndex >= 2 ? 'common.white' : 'text.primary',
  };
};

const resolveInvestmentValueAtDate = (investment: Investment, pointDate: dayjs.Dayjs) => {
  const investedValue = Number(investment.totalInvested || 0);
  const snapshots = Array.isArray(investment.valuationSnapshots)
    ? [...investment.valuationSnapshots]
    : [];

  const latestSnapshot = snapshots
    .filter((snapshot) => {
      const snapshotDate = dayjs(snapshot.snapshotDate);
      return snapshotDate.isValid() && !snapshotDate.isAfter(pointDate);
    })
    .sort(
      (left, right) =>
        dayjs(right.snapshotDate).valueOf() - dayjs(left.snapshotDate).valueOf(),
    )[0];

  if (latestSnapshot) {
    return Number(latestSnapshot.marketValue || investedValue);
  }

  const lastValuationAt = investment.lastValuationAt
    ? dayjs(investment.lastValuationAt)
    : null;
  const currentValue = Number(investment.currentValue ?? Number.NaN);

  if (
    lastValuationAt?.isValid() &&
    !lastValuationAt.isAfter(pointDate) &&
    Number.isFinite(currentValue)
  ) {
    return currentValue;
  }

  if (!pointDate.isBefore(dayjs(), 'day') && Number.isFinite(currentValue)) {
    return currentValue;
  }

  return investedValue;
};

const getCalendarItemInvestmentId = (item: InvestmentCalendarItem) => {
  const [rawId] = String(item.id || '').split('-');
  return rawId || null;
};

const getBucketMeta = (
  investmentId: string | number | null,
  investmentLookup: Map<string, Investment>,
  categoryLabelMap: Record<string, string>,
) => {
  const investment = investmentId ? investmentLookup.get(String(investmentId)) : null;
  const bucketKey = String(investment?.category || 'other');
  const bucketLabel =
    categoryLabelMap[bucketKey] || investment?.type || investment?.name || 'Other';

  return { bucketKey, bucketLabel };
};

const getProjectedInvestedAmountAtDate = (
  investment: Investment,
  pointDate: dayjs.Dayjs,
  events: InvestmentEvent[],
  scheduledItems: InvestmentCalendarItem[],
) => {
  const currentInvested = Number(investment.totalInvested || 0);
  const today = dayjs().endOf('day');

  const actualContributionsAfterPoint = events.reduce((sum, event) => {
    if (!isCountableEvent(event)) return sum;

    const eventDate = dayjs(event.eventDate);
    if (!eventDate.isValid()) return sum;
    if (!eventDate.isAfter(pointDate) || eventDate.isAfter(today)) return sum;

    return sum + Number(event.netAmount ?? event.amount ?? 0);
  }, 0);

  const scheduledContributionsBeforePoint = scheduledItems.reduce((sum, item) => {
    const itemDate = dayjs(item.date);
    if (!itemDate.isValid()) return sum;
    if (!itemDate.isAfter(today) || itemDate.isAfter(pointDate)) return sum;

    return sum + Number(item.amount || 0);
  }, 0);

  return currentInvested - actualContributionsAfterPoint + scheduledContributionsBeforePoint;
};

export default function InvestmentsCalendarView({
  calendarGroups,
  investmentEvents,
  investments,
  categoryLabelMap,
}: InvestmentsCalendarViewProps) {
  const [metric, setMetric] = useState<HeatmapMetric>('amount');
  const [viewMode, setViewMode] = useState<HeatmapViewMode>('month');

  const investmentLookup = useMemo(
    () => new Map(investments.map((investment) => [String(investment.id), investment])),
    [investments],
  );

  const scheduledContributionItems = useMemo(
    () =>
      Object.values(calendarGroups)
        .flat()
        .filter((item) => item.type !== 'Maturity'),
    [calendarGroups],
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>([dayjs().year()]);

    investmentEvents.forEach((event) => {
      const parsed = dayjs(event.eventDate);
      if (parsed.isValid()) years.add(parsed.year());
    });

    scheduledContributionItems.forEach((item) => {
      const parsed = dayjs(item.date);
      if (parsed.isValid()) years.add(parsed.year());
    });

    investments.forEach((investment) => {
      [investment.startDate, investment.createdAt, investment.lastValuationAt].forEach(
        (value) => {
          const parsed = dayjs(value);
          if (parsed.isValid()) years.add(parsed.year());
        },
      );

      (investment.valuationSnapshots || []).forEach((snapshot) => {
        const parsed = dayjs(snapshot.snapshotDate);
        if (parsed.isValid()) years.add(parsed.year());
      });
    });

    return Array.from(years).sort((left, right) => left - right);
  }, [investmentEvents, investments, scheduledContributionItems]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const currentYear = dayjs().year();
    return availableYears.includes(currentYear)
      ? currentYear
      : availableYears[availableYears.length - 1] || currentYear;
  });

  const normalizedSelectedYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[availableYears.length - 1] || dayjs().year();

  const bucketRows = useMemo(() => {
    const rows = new Map<string, BucketRow>();
    const eventsByInvestment = new Map<string, InvestmentEvent[]>();
    const scheduledByInvestment = new Map<string, InvestmentCalendarItem[]>();

    const ensureRow = (bucketKey: string, bucketLabel: string) => {
      const existing = rows.get(bucketKey);
      if (existing) return existing;

      const nextRow: BucketRow = {
        key: bucketKey,
        label: bucketLabel,
        investmentIds: [],
        monthCells: {},
        yearCells: {},
      };
      rows.set(bucketKey, nextRow);
      return nextRow;
    };

    investments.forEach((investment) => {
      const { bucketKey, bucketLabel } = getBucketMeta(
        investment.id,
        investmentLookup,
        categoryLabelMap,
      );
      const row = ensureRow(bucketKey, bucketLabel);
      const investmentId = String(investment.id);
      if (!row.investmentIds.includes(investmentId)) {
        row.investmentIds.push(investmentId);
      }
    });

    investmentEvents.forEach((event) => {
      const investmentId = String(event.investmentId);
      const linkedEvents = eventsByInvestment.get(investmentId) || [];
      linkedEvents.push(event);
      eventsByInvestment.set(investmentId, linkedEvents);

      if (!isCountableEvent(event)) return;

      const parsed = dayjs(event.eventDate);
      if (!parsed.isValid()) return;

      const { bucketKey, bucketLabel } = getBucketMeta(
        event.investmentId,
        investmentLookup,
        categoryLabelMap,
      );
      const row = ensureRow(bucketKey, bucketLabel);
      if (!row.investmentIds.includes(investmentId)) {
        row.investmentIds.push(investmentId);
      }

      const monthKey = getMonthKey(parsed.year(), parsed.month());
      const monthCell = row.monthCells[monthKey] || cloneEmptyCell();
      const eventAmount = Number(event.netAmount ?? event.amount ?? 0);
      monthCell.amount += eventAmount;
      monthCell.count += 1;
      monthCell.actualCount += 1;
      row.monthCells[monthKey] = monthCell;
    });

    scheduledContributionItems.forEach((item) => {
      const investmentId = getCalendarItemInvestmentId(item);
      const key = String(investmentId || 'other');
      const linkedItems = scheduledByInvestment.get(key) || [];
      linkedItems.push(item);
      scheduledByInvestment.set(key, linkedItems);

      const parsed = dayjs(item.date);
      if (!parsed.isValid()) return;

      const { bucketKey, bucketLabel } = getBucketMeta(
        investmentId,
        investmentLookup,
        categoryLabelMap,
      );
      const row = ensureRow(bucketKey, bucketLabel);
      if (investmentId && !row.investmentIds.includes(String(investmentId))) {
        row.investmentIds.push(String(investmentId));
      }

      const monthKey = getMonthKey(parsed.year(), parsed.month());
      const monthCell = row.monthCells[monthKey] || cloneEmptyCell();
      const scheduledAmount = Number(item.amount || 0);
      monthCell.amount += scheduledAmount;
      monthCell.count += 1;
      monthCell.scheduledCount += 1;
      row.monthCells[monthKey] = monthCell;
    });

    rows.forEach((row) => {
      availableYears.forEach((year) => {
        MONTH_LABELS.forEach((_, monthIndex) => {
          const monthKey = getMonthKey(year, monthIndex);
          const monthCell = row.monthCells[monthKey] || cloneEmptyCell();
          const periodEnd = dayjs(new Date(year, monthIndex + 1, 0)).endOf('day');

          monthCell.profitLoss = row.investmentIds.reduce((sum, investmentId) => {
            const investment = investmentLookup.get(investmentId);
            if (!investment) return sum;

            const projectedInvested = getProjectedInvestedAmountAtDate(
              investment,
              periodEnd,
              eventsByInvestment.get(investmentId) || [],
              scheduledByInvestment.get(investmentId) || [],
            );
            const projectedValue = resolveInvestmentValueAtDate(investment, periodEnd);

            return sum + (projectedValue - projectedInvested);
          }, 0);

          row.monthCells[monthKey] = monthCell;
        });

        const yearKey = getYearKey(year);
        const yearCell = cloneEmptyCell();

        MONTH_LABELS.forEach((_, monthIndex) => {
          const monthCell = row.monthCells[getMonthKey(year, monthIndex)] || EMPTY_CELL;
          yearCell.amount += monthCell.amount;
          yearCell.count += monthCell.count;
          yearCell.scheduledCount += monthCell.scheduledCount;
          yearCell.actualCount += monthCell.actualCount;
        });

        const yearEnd = dayjs(`${year}-12-31`).endOf('day');
        yearCell.profitLoss = row.investmentIds.reduce((sum, investmentId) => {
          const investment = investmentLookup.get(investmentId);
          if (!investment) return sum;

          const projectedInvested = getProjectedInvestedAmountAtDate(
            investment,
            yearEnd,
            eventsByInvestment.get(investmentId) || [],
            scheduledByInvestment.get(investmentId) || [],
          );
          const projectedValue = resolveInvestmentValueAtDate(investment, yearEnd);

          return sum + (projectedValue - projectedInvested);
        }, 0);

        row.yearCells[yearKey] = yearCell;
      });
    });

    return Array.from(rows.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [
    availableYears,
    categoryLabelMap,
    investmentEvents,
    investmentLookup,
    investments,
    scheduledContributionItems,
  ]);

  const displayedPeriods = useMemo<PeriodDescriptor[]>(() => {
    if (viewMode === 'month') {
      return MONTH_LABELS.map((label, monthIndex) => ({
        key: getMonthKey(normalizedSelectedYear, monthIndex),
        label,
        year: normalizedSelectedYear,
        monthIndex,
      }));
    }

    return availableYears.map((year) => ({
      key: getYearKey(year),
      label: String(year),
      year,
    }));
  }, [availableYears, normalizedSelectedYear, viewMode]);

  const maxMetricValue = useMemo(() => {
    const values = bucketRows.flatMap((row) =>
      displayedPeriods.map((period) => {
        const cell =
          viewMode === 'month'
            ? row.monthCells[period.key] || EMPTY_CELL
            : row.yearCells[period.key] || EMPTY_CELL;
        return getMetricValue(cell, metric);
      }),
    );

    if (metric === 'profitLoss') {
      return Math.max(...values.map((value) => Math.abs(value)), 0);
    }

    return Math.max(...values, 0);
  }, [bucketRows, displayedPeriods, metric, viewMode]);

  return (
    <Stack spacing={2}>
      <SectionCard
        title="Investment Activity"
        empty={bucketRows.length === 0}
        emptyState={{
          title: 'No investment activity available',
          description:
            'Categories will light up as contributions, schedules, and valuation snapshots become available.',
        }}
      >
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'stretch', md: 'flex-start' },
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              sx={{ alignItems: { xs: 'stretch', md: 'center' }, flex: 1, minWidth: 0 }}
            >
              <Select
                size="small"
                value={metric}
                onChange={(event) => setMetric(event.target.value as HeatmapMetric)}
                sx={{ minWidth: 160, backgroundColor: 'background.paper' }}
              >
                <MenuItem value="amount">Amount</MenuItem>
                <MenuItem value="count">Count</MenuItem>
                <MenuItem value="profitLoss">Profit/Loss</MenuItem>
              </Select>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ lineHeight: 1.35, minWidth: 0 }}
              >
                {getMetricDescription(metric)}
              </Typography>
            </Stack>

            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <AppButton
                size="small"
                variant={viewMode === 'month' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('month')}
              >
                Month
              </AppButton>
              <AppButton
                size="small"
                variant={viewMode === 'year' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('year')}
              >
                Year
              </AppButton>
              {viewMode === 'month' ? (
                <Select
                  size="small"
                  value={normalizedSelectedYear}
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                  sx={{ minWidth: 120, backgroundColor: 'background.paper' }}
                >
                  {availableYears.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              ) : null}
            </Stack>
            </Stack>
          </Box>

          <Divider />

          <Box sx={{ overflowX: 'auto' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `minmax(148px, 180px) repeat(${displayedPeriods.length}, minmax(66px, 1fr))`,
                gap: 0.75,
                minWidth: 720,
              }}
            >
              <Box
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  backgroundColor: 'background.paper',
                }}
              />
              {displayedPeriods.map((period) => (
                <Typography
                  key={period.key}
                  variant="caption"
                  sx={{
                    px: 0.25,
                    py: 0.5,
                    textAlign: 'center',
                    fontWeight: 800,
                    color: 'text.secondary',
                    letterSpacing: 0.2,
                  }}
                >
                  {period.label}
                </Typography>
              ))}

              {bucketRows.map((row) => (
                <Box key={row.key} sx={{ display: 'contents' }}>
                  <Box
                    sx={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      pr: 1,
                      py: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.15 }}>
                      {row.label}
                    </Typography>
                  </Box>
                  {displayedPeriods.map((period) => {
                    const cell =
                      viewMode === 'month'
                        ? row.monthCells[period.key] || EMPTY_CELL
                        : row.yearCells[period.key] || EMPTY_CELL;
                    const value = getMetricValue(cell, metric);
                    const color = getCellColor(value, maxMetricValue, metric, value === 0);
                    const tooltipTitle = (
                      <Box sx={{ minWidth: 200 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                          {row.label} • {period.label}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: '#64748b', mb: 1 }}>
                          {viewMode === 'month'
                            ? 'Actual past/current data with scheduled future contributions.'
                            : 'Yearly roll-up of actual past/current data with scheduled future contributions.'}
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Stack spacing={0.75}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                            }}
                          >
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>Amount</Typography>
                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#0f766e' }}>
                              {formatInvestmentCurrency(cell.amount)}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                            }}
                          >
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>Count</Typography>
                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#2563eb' }}>
                              {cell.count}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                            }}
                          >
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>Actual</Typography>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                              {cell.actualCount}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                            }}
                          >
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>Scheduled</Typography>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>
                              {cell.scheduledCount}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                            }}
                          >
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>Profit/Loss</Typography>
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: cell.profitLoss >= 0 ? '#15803d' : '#be123c',
                              }}
                            >
                              {cell.profitLoss >= 0 ? '+' : '-'}
                              {formatInvestmentCurrency(Math.abs(cell.profitLoss))}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    );

                    return (
                      <Tooltip
                        key={`${row.key}-${period.key}`}
                        title={tooltipTitle}
                        arrow
                        placement="top"
                        slotProps={{
                          tooltip: {
                            sx: {
                              bgcolor: '#ffffff',
                              color: '#0f172a',
                              border: '1px solid rgba(148, 163, 184, 0.22)',
                              borderRadius: 1.5,
                              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
                              px: 1.5,
                              py: 1.25,
                            },
                          },
                          arrow: {
                            sx: {
                              color: '#ffffff',
                              '&:before': {
                                border: '1px solid rgba(148, 163, 184, 0.22)',
                              },
                            },
                          },
                        }}
                      >
                        <Paper
                          variant="outlined"
                          sx={{
                            minHeight: 64,
                            px: 0.5,
                            py: 0.75,
                            borderRadius: 1.25,
                            borderColor: color.borderColor,
                            backgroundColor: color.backgroundColor,
                            color: color.textColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            cursor: 'default',
                          }}
                        >
                          <Stack spacing={0.15} sx={{ width: '100%' }}>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 800, lineHeight: 1.1 }}
                            >
                              {formatCompactMetric(value, metric)}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ opacity: 0.82, lineHeight: 1.05 }}
                            >
                              {cell.actualCount > 0 && cell.scheduledCount > 0
                                ? `${cell.actualCount}A/${cell.scheduledCount}S`
                                : cell.actualCount > 0
                                  ? `${cell.actualCount}A`
                                  : cell.scheduledCount > 0
                                    ? `${cell.scheduledCount}S`
                                    : metric === 'profitLoss'
                                      ? cell.profitLoss > 0
                                        ? 'Gain'
                                        : cell.profitLoss < 0
                                          ? 'Loss'
                                          : '-'
                                      : '-'}
                            </Typography>
                          </Stack>
                        </Paper>
                      </Tooltip>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Rows are categories. Columns are {viewMode === 'month' ? 'months' : 'years'}. Past and current periods use actual events. Future periods use scheduled contribution items. Hover a cell for the exact split.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="caption" color="text.secondary">
                {metric === 'profitLoss' ? 'Loss' : 'Lower'}
              </Typography>
              {(metric === 'profitLoss'
                ? ['#fff1f2', '#fecdd3', '#e5e7eb', '#bbf7d0', '#15803d']
                : metric === 'count'
                  ? ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1d4ed8']
                  : ['#ecfeff', '#99f6e4', '#2dd4bf', '#0f766e', '#115e59']
              ).map((color, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 20,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: color,
                  }}
                />
              ))}
              <Typography variant="caption" color="text.secondary">
                {metric === 'profitLoss' ? 'Gain' : 'Higher'}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </SectionCard>
    </Stack>
  );
}
