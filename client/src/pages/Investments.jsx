import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@mdi/react';
import {
  mdiBankOutline,
  mdiCalendarClockOutline,
  mdiCheckCircleOutline,
  mdiDeleteOutline,
  mdiEyeOutline,
  mdiShieldCheckOutline,
  mdiTrendingUp,
  mdiPencilOutline,
} from '@mdi/js';
import {
  Box,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { getFinancialAccounts } from '../api/financialAccounts';
import { createInvestmentAssetTaxonomy, deleteInvestmentAssetTaxonomy, getInvestmentAssetTaxonomy, updateInvestmentAssetTaxonomy } from '../api/investmentAssetTaxonomy';
import { createInvestment, deleteInvestment, getInvestments, updateInvestment } from '../api/investments';
import InvestmentAssetTaxonomyFormDrawer from '../components/InvestmentAssetTaxonomyFormDrawer';
import InvestmentFormDrawer from '../components/InvestmentFormDrawer';
import AppButton from '../components/common/AppButton';
import {
  DataTable,
  EmptyState,
  FilterBar,
  KpiCard,
  SearchBar,
  SectionCard,
  StatusChip,
} from '../components/common';
import ConfirmDialog from '../components/dialogs/ConfirmDialog';
import { InvestmentViewDrawer } from '../components/drawers';
import RecordContributionModal from '../components/modals/RecordContributionModal';
import { useHeaderAction } from '../hooks/useHeaderAction';
import { useNotificationStore } from '../store/notificationStore';
import {
  buildInvestmentFromForm,
  formatInvestmentCurrency,
  formatInvestmentDate,
  getInvestmentCategoryLabel,
  getInvestmentCategoryOptions,
  getInvestmentStatusTone,
  normalizeInvestmentForUi,
  STATUS_OPTIONS,
} from '../utils/investmentHelpers';
import { getRuntimeErrorMessage } from '../utils/errorMessage';

const DONUT_PALETTE = [
  '#0f766e', '#14b8a6', '#0ea5e9', '#6366f1', '#f59e0b',
  '#ef4444', '#8b5cf6', '#10b981', '#f97316', '#ec4899',
];

const FISCAL_YEAR_START_MONTH = 3;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function TimeSeriesVisualization({ data, onDrill, onBack, isDrillMode, formatValue, categoryLabelMap }) {
  const [hoveredIndex, setHoveredIndex] = React.useState(null);

  if (data.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
        No investment data available
      </Typography>
    );
  }

  const maxInvested = Math.max(...data.map((d) => d.invested));
  const maxReturn = Math.max(...data.map((d) => Math.abs(d.return)), 1);
  const maxTotal = Math.max(maxInvested, maxReturn);
  
  const padding = { top: 24, right: 24, bottom: 60, left: 80 };
  const chartWidth = 1000;
  const chartHeight = 320;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Generate line paths and data points for both invested and return
  const points = data.map((item, idx) => {
    const x = padding.left + (idx / (data.length - 1 || 1)) * plotWidth;
    const yInvested = padding.top + plotHeight - (item.invested / maxTotal) * plotHeight;
    const yReturn = padding.top + plotHeight - (item.return / maxTotal) * plotHeight;
    return { x, yInvested, yReturn, ...item, idx };
  });

  const linePathInvested = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.yInvested}`).join(' ');
  const linePathReturn = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.yReturn}`).join(' ');

  // Y-axis gridlines and labels
  const gridLines = [];
  const yAxisLabels = [];
  for (let i = 0; i <= 5; i++) {
    const ratio = i / 5;
    const y = padding.top + plotHeight - ratio * plotHeight;
    const value = (ratio * maxTotal);
    gridLines.push(
      <line key={`grid-${i}`} x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
    );
    yAxisLabels.push(
      <text key={`label-${i}`} x={padding.left - 8} y={y} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 11, fill: '#6b7280' }}>
        {formatValue(value)}
      </text>
    );
  }

  const categoryColors = {};
  if (data[0]) {
    Object.keys(data[0].investedBreakdown).forEach((cat, idx) => {
      categoryColors[cat] = DONUT_PALETTE[idx % DONUT_PALETTE.length];
    });
  }

  return (
    <Stack spacing={2}>
      {isDrillMode && (
        <Box sx={{ mb: 1 }}>
          <AppButton variant="text" onClick={onBack} sx={{ mb: 1 }}>
            ← Back to Yearly View
          </AppButton>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Chart */}
        <Box sx={{ overflowX: 'auto', p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <svg width={chartWidth} height={chartHeight} style={{ display: 'block' }}>
            {/* Y-axis */}
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke="#d1d5db" strokeWidth="1" />

            {/* X-axis */}
            <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="#d1d5db" strokeWidth="1" />

            {/* Gridlines and Y-axis labels */}
            {gridLines}
            {yAxisLabels}

            {/* X-axis labels */}
            {points.map((p) => (
              <text
                key={`x-label-${p.idx}`}
                x={p.x}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                style={{ fontSize: 11, fill: '#6b7280' }}
              >
                {p.label}
              </text>
            ))}

            {/* Line charts */}
            <path d={linePathInvested} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
            <path d={linePathReturn} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4,4" />

            {/* Data points with hover interaction */}
            {points.map((p) => {
              // Smart tooltip positioning
              const tooltipWidth = 160;
              const tooltipHeight = 65;
              const tooltipGap = 8;
              const spaceAbove = p.yInvested - padding.top;
              const positionBelow = spaceAbove < (tooltipHeight + tooltipGap + 5);
              
              const tooltipX = Math.max(padding.left, Math.min(p.x - tooltipWidth / 2, chartWidth - padding.right - tooltipWidth));
              const tooltipY = positionBelow ? Math.max(padding.top, p.yInvested + tooltipGap) : p.yInvested - tooltipHeight - tooltipGap;
              const textBaseY = positionBelow ? tooltipY + 18 : tooltipY + 13;

              return (
                <g key={`point-${p.idx}`}>
                  {/* Invested point */}
                  <circle 
                    cx={p.x} 
                    cy={p.yInvested} 
                    r={hoveredIndex === p.idx ? 6 : 4} 
                    fill="#3b82f6" 
                    opacity={hoveredIndex === p.idx ? 1 : 0.8} 
                    onClick={() => !isDrillMode && onDrill(p.label)}
                    style={{ cursor: !isDrillMode ? 'pointer' : 'default', transition: 'all 0.15s' }}
                    onMouseEnter={() => setHoveredIndex(p.idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  
                  {/* Return point */}
                  <circle 
                    cx={p.x} 
                    cy={p.yReturn} 
                    r={hoveredIndex === p.idx ? 6 : 4} 
                    fill="#10b981" 
                    opacity={hoveredIndex === p.idx ? 1 : 0.8} 
                    onClick={() => !isDrillMode && onDrill(p.label)}
                    style={{ cursor: !isDrillMode ? 'pointer' : 'default', transition: 'all 0.15s' }}
                    onMouseEnter={() => setHoveredIndex(p.idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />

                  {/* Tooltip on hover */}
                  {hoveredIndex === p.idx && (
                    <g>
                      <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="4" fill="#1f2937" opacity="0.95" />
                      <text x={tooltipX + tooltipWidth / 2} y={textBaseY} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: '#fff' }}>
                        {p.label}
                      </text>
                      <text x={tooltipX + 12} y={textBaseY + 16} style={{ fontSize: 10, fill: '#e5e7eb' }}>
                        <tspan fontWeight="600">Invested:</tspan>
                      </text>
                      <text x={tooltipX + tooltipWidth - 12} y={textBaseY + 16} textAnchor="end" style={{ fontSize: 10, fill: '#3b82f6', fontWeight: 700 }}>
                        {formatValue(p.invested)}
                      </text>
                      <text x={tooltipX + 12} y={textBaseY + 32} style={{ fontSize: 10, fill: '#e5e7eb' }}>
                        <tspan fontWeight="600">Return:</tspan>
                      </text>
                      <text x={tooltipX + tooltipWidth - 12} y={textBaseY + 32} textAnchor="end" style={{ fontSize: 10, fill: '#10b981', fontWeight: 700 }}>
                        {formatValue(p.return)} {p.invested > 0 ? `(${((p.return / p.invested) * 100).toFixed(1)}%)` : ''}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </Box>

        {/* Legend showing category breakdown for hovered year */}
        <Box sx={{ flex: 1, minWidth: 220 }}>
          {hoveredIndex !== null && data[hoveredIndex] ? (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%', overflowY: 'auto', maxHeight: 400 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
                {data[hoveredIndex].label}
              </Typography>
              
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#3b82f6', display: 'block', mb: 1 }}>
                Invested
              </Typography>
              <Stack spacing={0.75} sx={{ mb: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                {Object.entries(data[hoveredIndex].investedBreakdown)
                  .filter(([, val]) => val > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, val]) => (
                    <Box key={`inv-${cat}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: categoryColors[cat],
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {categoryLabelMap[cat] || cat}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, flexShrink: 0 }}>
                        {formatValue(val)}
                      </Typography>
                    </Box>
                  ))}
              </Stack>

              <Typography variant="caption" sx={{ fontWeight: 700, color: '#10b981', display: 'block', mb: 1 }}>
                Return
              </Typography>
              <Stack spacing={0.75}>
                {Object.entries(data[hoveredIndex].returnBreakdown)
                  .filter(([, val]) => val !== 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, val]) => {
                    const investedAmount = data[hoveredIndex].investedBreakdown[cat] || 0;
                    const returnPct = investedAmount > 0 ? ((val / investedAmount) * 100).toFixed(1) : 0;
                    return (
                      <Box key={`ret-${cat}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: categoryColors[cat],
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {categoryLabelMap[cat] || cat}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, flexShrink: 0, color: val >= 0 ? '#10b981' : '#ef4444' }}>
                          {formatValue(val)} ({returnPct}%)
                        </Typography>
                      </Box>
                    );
                  })}
              </Stack>
            </Box>
          ) : (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Hover over a data point to see the breakdown
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, pt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 24, height: 2, backgroundColor: '#3b82f6' }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>Invested</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 24, height: 2, backgroundColor: '#10b981', backgroundImage: 'repeating-linear-gradient(90deg, #10b981 0px, #10b981 4px, transparent 4px, transparent 8px)' }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>Return</Typography>
        </Box>
      </Box>

      {/* Instructions */}
      {!isDrillMode && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          Hover to see category breakdown • Click a point to see monthly detail
        </Typography>
      )}
    </Stack>
  );
}

function AllocationDonutChart({ data, total, formatValue }) {
  const [activeIndex, setActiveIndex] = React.useState(null);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 80;
  const innerR = 50;
  const gap = 0.018; // radians gap between segments

  const safeTotal = Math.max(total, 1);
  let cumAngle = -Math.PI / 2;

  const segments = data.map((item, index) => {
    const fraction = item.value / safeTotal;
    const sweep = fraction * 2 * Math.PI - gap;
    const startAngle = cumAngle + gap / 2;
    const endAngle = startAngle + sweep;
    cumAngle += fraction * 2 * Math.PI;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    return { ...item, d, color: DONUT_PALETTE[index % DONUT_PALETTE.length], fraction };
  });

  const active = activeIndex !== null ? segments[activeIndex] : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 3 }}>
      <Box sx={{ flexShrink: 0, position: 'relative' }}>
        <svg width={size} height={size} style={{ display: 'block' }}>
          {segments.map((seg, i) => (
            <path
              key={seg.label}
              d={seg.d}
              fill={seg.color}
              opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
          {/* Centre label */}
          <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }}>
            {active ? active.label.slice(0, 12) : 'Total'}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 12, fill: '#111827', fontWeight: 700 }}>
            {active ? `${(active.fraction * 100).toFixed(1)}%` : '100%'}
          </text>
          <text x={cx} y={cy + 26} textAnchor="middle" style={{ fontSize: 10, fill: '#6b7280' }}>
            {active ? formatValue(active.value) : formatValue(total)}
          </text>
        </svg>
      </Box>

      <Stack spacing={0.75} sx={{ flex: 1, width: '100%' }}>
        {segments.map((seg, i) => (
          <Box
            key={seg.label}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              cursor: 'default',
              opacity: activeIndex === null || activeIndex === i ? 1 : 0.45,
              transition: 'opacity 0.15s',
              backgroundColor: activeIndex === i ? 'action.hover' : 'transparent',
            }}
          >
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: seg.color, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{seg.label}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {(seg.fraction * 100).toFixed(1)}%
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 80, textAlign: 'right' }}>
              {formatValue(seg.value)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

const VIEW_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'assets', label: 'Assets' },
  { value: 'calendar', label: 'Calendar' },
];

const isWithinDays = (value, days) => {
  if (!value) return false;
  const parsed = dayjs(value).startOf('day');
  const today = dayjs().startOf('day');
  return parsed.isAfter(today.subtract(1, 'day')) && parsed.isBefore(today.add(days + 1, 'day'));
};

export default function Investments() {
  const [activeView, setActiveView] = useState('dashboard');
  const [investments, setInvestments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [taxonomyNodes, setTaxonomyNodes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assetTaxonomyDrawerOpen, setAssetTaxonomyDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create');
  const [selectedInvestmentId, setSelectedInvestmentId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedYearForDrill, setSelectedYearForDrill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [taxonomyFormError, setTaxonomyFormError] = useState('');
  const [recordContributionModalOpen, setRecordContributionModalOpen] = useState(false);
  const [selectedContributionForRecording, setSelectedContributionForRecording] = useState(null);
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [taxonomyList, investmentList, accountList] = await Promise.all([
          getInvestmentAssetTaxonomy(),
          getInvestments(),
          getFinancialAccounts(),
        ]);
        if (active) {
          const nextTaxonomyNodes = Array.isArray(taxonomyList) ? taxonomyList : [];
          setTaxonomyNodes(nextTaxonomyNodes);
          setAccounts(Array.isArray(accountList) ? accountList : []);
          setInvestments(Array.isArray(investmentList) ? investmentList.map((item) => normalizeInvestmentForUi(item, nextTaxonomyNodes)) : []);
        }
      } catch (error) {
        void error;
        if (active) {
          setTaxonomyNodes([]);
          setAccounts([]);
          setInvestments([]);
        }
        pushNotification({ type: 'error', message: 'Failed to load investments' });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [pushNotification]);

  const openCreateDrawer = () => {
    if (accounts.length === 0) {
      pushNotification({
        type: 'warning',
        message: 'Please add a financial account before adding an investment.',
      });
      return;
    }

    setDrawerMode('create');
    setSelectedInvestmentId(null);
    setDrawerOpen(true);
  };

  const openAssetTaxonomyDrawer = () => {
    setTaxonomyFormError('');
    setAssetTaxonomyDrawerOpen(true);
  };

  useHeaderAction('investments', {
    label: 'Investment',
    onClick: openCreateDrawer,
    disabled: loading || accounts.length === 0,
  });

  const filteredInvestments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return investments.filter((investment) => {
      const matchesSearch =
        !query ||
        [investment.name, investment.type, investment.institution, investment.referenceNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'all' || investment.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || investment.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, investments, search, statusFilter]);
  const hasInvestmentFilters =
    Boolean(search.trim()) || statusFilter !== 'all' || categoryFilter !== 'all';
  const isFirstInvestmentSetup = investments.length === 0 && !hasInvestmentFilters;

  const dashboardKpis = useMemo(() => {
    const totalInvested = investments.reduce((sum, item) => sum + Number(item.totalInvested || 0), 0);
    const totalCurrentValue = investments.reduce((sum, item) => sum + Number(item.currentValue || item.totalInvested || 0), 0);
    const totalReturn = totalCurrentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;
    const upcomingMaturity = investments
      .filter((item) => item.status === 'active' && isWithinDays(item.maturityDate, 90))
      .reduce((sum, item) => sum + Number(item.currentValue || item.totalInvested || 0), 0);
    const insuranceCover = investments
      .filter((item) => item.category === 'insurance' && item.status === 'active')
      .reduce((sum, item) => sum + Number(item.insuranceCover || 0), 0);

    return {
      totalInvestments: investments.length,
      totalInvested,
      totalCurrentValue,
      totalReturn,
      returnPercentage,
      upcomingMaturity,
      insuranceCover,
    };
  }, [investments]);

  const topCurrentValueItems = useMemo(() => {
    return [...investments]
      .sort((left, right) => Number(right.currentValue || right.totalInvested || 0) - Number(left.currentValue || left.totalInvested || 0))
      .slice(0, 5);
  }, [investments]);

  const upcomingMaturityItems = useMemo(() => {
    return [...investments]
      .filter((item) => item.status === 'active' && item.maturityDate)
      .sort((left, right) => dayjs(left.maturityDate).valueOf() - dayjs(right.maturityDate).valueOf())
      .slice(0, 5);
  }, [investments]);

  const recentInvestments = useMemo(() => {
    return [...investments]
      .sort((left, right) => dayjs(right.createdAt || right.startDate).valueOf() - dayjs(left.createdAt || left.startDate).valueOf())
      .slice(0, 5);
  }, [investments]);

  const upcomingContributions = useMemo(() => {
    return [...investments]
      .filter((item) => item.status === 'active' && item.activeContributionPlan?.nextDueDate)
      .sort((left, right) => {
        return dayjs(left.activeContributionPlan.nextDueDate).valueOf() - dayjs(right.activeContributionPlan.nextDueDate).valueOf();
      })
      .slice(0, 6);
  }, [investments]);

  const categoryBreakdown = useMemo(() => {
    const totals = investments.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Number(item.totalInvested || 0);
      return acc;
    }, {});

    return getInvestmentCategoryOptions(taxonomyNodes).filter((option) => option.value !== 'all')
      .map((option) => ({
        label: option.label,
        value: totals[option.value] || 0,
      }))
      .filter((item) => item.value > 0)
      .sort((left, right) => right.value - left.value);
  }, [investments, taxonomyNodes]);

  const categoryOptions = useMemo(() => getInvestmentCategoryOptions(taxonomyNodes), [taxonomyNodes]);

  const categoryLabelMap = useMemo(() => {
    const map = {};
    getInvestmentCategoryOptions(taxonomyNodes)
      .filter((opt) => opt.value !== 'all')
      .forEach((opt) => { map[opt.value] = opt.label; });
    return map;
  }, [taxonomyNodes]);

  const yearlyTimeSeriesData = useMemo(() => {
    if (investments.length === 0) return [];
    
    const yearGroups = {};
    
    investments.forEach((inv) => {
      const startDate = inv.startDate ? new Date(inv.startDate) : null;
      if (!startDate || Number.isNaN(startDate.getTime())) return;
      
      const month = startDate.getMonth();
      const year = startDate.getFullYear();
      const fiscalYear = month >= FISCAL_YEAR_START_MONTH ? year : year - 1;
      const fiscalYearLabel = `FY ${fiscalYear}-${String(fiscalYear + 1).slice(-2)}`;
      
      if (!yearGroups[fiscalYearLabel]) {
        yearGroups[fiscalYearLabel] = {
          label: fiscalYearLabel,
          invested: 0,
          return: 0,
          investedBreakdown: {},
          returnBreakdown: {}
        };
      }
      
      const investedAmount = Number(inv.totalInvested || 0);
      const currentAmount = Number(inv.currentValue || inv.totalInvested || 0);
      const returnAmount = currentAmount - investedAmount;
      
      yearGroups[fiscalYearLabel].invested += investedAmount;
      yearGroups[fiscalYearLabel].return += returnAmount;
      
      const category = inv.category || 'other';
      yearGroups[fiscalYearLabel].investedBreakdown[category] = 
        (yearGroups[fiscalYearLabel].investedBreakdown[category] || 0) + investedAmount;
      yearGroups[fiscalYearLabel].returnBreakdown[category] = 
        (yearGroups[fiscalYearLabel].returnBreakdown[category] || 0) + returnAmount;
    });
    
    return Object.values(yearGroups).sort((a, b) => {
      const aYear = parseInt(a.label.split(' ')[1].split('-')[0]);
      const bYear = parseInt(b.label.split(' ')[1].split('-')[0]);
      return aYear - bYear;
    });
  }, [investments]);

  const monthlyTimeSeriesData = useMemo(() => {
    if (!selectedYearForDrill || investments.length === 0) return [];
    
    const yearMatch = selectedYearForDrill.match(/FY (\d+)-(\d+)/);
    if (!yearMatch) return [];
    
    const startYear = parseInt(yearMatch[1]);
    
    const monthGroups = {};
    for (let i = 0; i < 12; i++) {
      const actualMonth = (FISCAL_YEAR_START_MONTH + i) % 12;
      const actualYear = startYear + Math.floor((FISCAL_YEAR_START_MONTH + i) / 12);
      const monthKey = `${MONTH_NAMES[actualMonth]} ${actualYear}`;
      monthGroups[monthKey] = {
        label: monthKey,
        invested: 0,
        return: 0,
        investedBreakdown: {},
        returnBreakdown: {}
      };
    }
    
    investments.forEach((inv) => {
      const startDate = inv.startDate ? new Date(inv.startDate) : null;
      if (!startDate || Number.isNaN(startDate.getTime())) return;
      
      const month = startDate.getMonth();
      const year = startDate.getFullYear();
      const fiscalYear = month >= FISCAL_YEAR_START_MONTH ? year : year - 1;
      
      if (fiscalYear !== startYear) return;
      
      const monthKey = `${MONTH_NAMES[month]} ${year}`;
      if (monthKey in monthGroups) {
        const investedAmount = Number(inv.totalInvested || 0);
        const currentAmount = Number(inv.currentValue || inv.totalInvested || 0);
        const returnAmount = currentAmount - investedAmount;
        
        monthGroups[monthKey].invested += investedAmount;
        monthGroups[monthKey].return += returnAmount;
        
        const category = inv.category || 'other';
        monthGroups[monthKey].investedBreakdown[category] = 
          (monthGroups[monthKey].investedBreakdown[category] || 0) + investedAmount;
        monthGroups[monthKey].returnBreakdown[category] = 
          (monthGroups[monthKey].returnBreakdown[category] || 0) + returnAmount;
      }
    });
    
    return Object.values(monthGroups).filter(m => m.invested > 0 || m.return !== 0);
  }, [selectedYearForDrill, investments]);

  const calendarItems = useMemo(() => {
    return investments
      .flatMap((investment) => {
        const items = [];

        if (investment.maturityDate) {
          items.push({
            id: `${investment.id}-maturity`,
            title: investment.name,
            type: 'Maturity',
            date: investment.maturityDate,
            amount: investment.currentValue || investment.totalInvested,
            subtitle: `${investment.institution} • ${investment.type}`,
          });
        }

        if (investment.activeContributionPlan?.nextDueDate) {
          items.push({
            id: `${investment.id}-contribution`,
            title: investment.name,
            type: 'Contribution Due',
            date: investment.activeContributionPlan.nextDueDate,
            amount: investment.activeContributionPlan.amount,
            subtitle: `${investment.institution} • ${investment.activeContributionPlan.cadenceInterval > 1 ? `every ${investment.activeContributionPlan.cadenceInterval} ` : ''}${investment.activeContributionPlan.cadenceUnit}`,
          });
        }

        return items;
      })
      .filter((item) => dayjs(item.date).isAfter(dayjs().subtract(1, 'day')))
      .sort((left, right) => dayjs(left.date).valueOf() - dayjs(right.date).valueOf());
  }, [investments]);

  const calendarGroups = useMemo(() => {
    return calendarItems.reduce((acc, item) => {
      const key = dayjs(item.date).format('MMMM YYYY');
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [calendarItems]);

  const selectedInvestment = useMemo(
    () => investments.find((item) => item.id === selectedInvestmentId) || null,
    [investments, selectedInvestmentId]
  );

  const openEditDrawer = (investment) => {
    setDrawerMode('edit');
    setSelectedInvestmentId(investment.id);
    setDrawerOpen(true);
  };

  const openViewDrawer = (investment) => {
    setDrawerMode('view');
    setSelectedInvestmentId(investment.id);
    setDrawerOpen(true);
  };

  const openRecordContributionModal = (investment, contributionPlan) => {
    setSelectedContributionForRecording({ investment, contributionPlan });
    setRecordContributionModalOpen(true);
  };

  const closeRecordContributionModal = () => {
    setRecordContributionModalOpen(false);
    setSelectedContributionForRecording(null);
  };

  const handleContributionRecorded = async (response) => {
    // Refresh the investment data
    try {
      const updatedInvestments = await getInvestments();
      setInvestments(Array.isArray(updatedInvestments) ? updatedInvestments.map((item) => normalizeInvestmentForUi(item, taxonomyNodes)) : []);
      pushNotification({ type: 'success', message: 'Contribution recorded and investment data updated' });
    } catch (error) {
      pushNotification({ type: 'error', message: 'Contribution recorded but failed to refresh data' });
    }
  };

  const closeInvestmentDrawer = () => {
    setDrawerOpen(false);
    setSelectedInvestmentId(null);
    setDrawerMode('create');
  };

  const closeAssetTaxonomyDrawer = () => {
    setTaxonomyFormError('');
    setAssetTaxonomyDrawerOpen(false);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  const handleSaveInvestment = async (formValues) => {
    const nextInvestment = buildInvestmentFromForm(formValues, drawerMode === 'edit' ? selectedInvestmentId : null, taxonomyNodes);

    try {
      if (drawerMode === 'edit') {
        const updated = await updateInvestment(selectedInvestmentId, nextInvestment);
        setInvestments((current) => current.map((item) => (item.id === selectedInvestmentId ? normalizeInvestmentForUi(updated, taxonomyNodes) : item)));
      } else {
        const created = await createInvestment(nextInvestment);
        setInvestments((current) => [normalizeInvestmentForUi(created, taxonomyNodes), ...current]);
      }

      pushNotification({
        type: 'success',
        message: drawerMode === 'edit' ? 'Investment updated' : 'Investment added',
      });
      closeInvestmentDrawer();
      return null;
    } catch (error) {
      return getRuntimeErrorMessage(
        error,
        drawerMode === 'edit' ? 'Failed to update investment' : 'Failed to add investment'
      );
    }
  };

  const handleDeleteInvestment = () => {
    if (!deleteTarget) return;

    const removeInvestment = async () => {
      try {
        await deleteInvestment(deleteTarget.id);
        setInvestments((current) => current.filter((item) => item.id !== deleteTarget.id));
        setDeleteTarget(null);
        pushNotification({ type: 'success', message: 'Investment removed' });
      } catch (error) {
        void error;
        pushNotification({ type: 'error', message: 'Failed to remove investment' });
      }
    };

    void removeInvestment();
  };

  const handleSaveAssetTaxonomy = (formValues) => {
    const persistAssetTaxonomy = async () => {
      setTaxonomyFormError('');
      try {
        if (formValues.id) {
          const updatedNode = await updateInvestmentAssetTaxonomy(formValues.id, formValues);
          setTaxonomyNodes((current) => current.map((node) => (node.id === updatedNode.id ? updatedNode : node)));
          pushNotification({ type: 'success', message: 'Asset taxonomy updated' });
          setTaxonomyFormError('');
          return updatedNode;
        } else {
          const createdNode = await createInvestmentAssetTaxonomy(formValues);
          setTaxonomyNodes((current) => [...current, createdNode]);
          pushNotification({ type: 'success', message: 'Asset taxonomy saved' });
          setTaxonomyFormError('');
          return createdNode;
        }
      } catch (error) {
        setTaxonomyFormError(
          getRuntimeErrorMessage(
            error,
            formValues.id ? 'Failed to update asset taxonomy' : 'Failed to save asset taxonomy'
          )
        );
        return null;
      }
    };

    return persistAssetTaxonomy();
  };

  const handleDeleteAssetTaxonomy = (targetNode) => {
    const collectBranchIds = (nodes, rootId) => {
      const normalizedRootId = String(rootId);
      const ids = new Set([normalizedRootId]);
      const queue = [normalizedRootId];

      while (queue.length) {
        const currentId = queue.shift();
        nodes.forEach((node) => {
          const nodeId = String(node.id);
          const parentId = node.parentId == null ? null : String(node.parentId);

          if (!ids.has(nodeId) && parentId === currentId) {
            ids.add(nodeId);
            queue.push(nodeId);
          }
        });
      }

      return ids;
    };

    const removeAssetTaxonomy = async () => {
      try {
        await deleteInvestmentAssetTaxonomy(targetNode.id);
        const deletedIds = collectBranchIds(taxonomyNodes, targetNode.id);
        setTaxonomyNodes((current) => current.filter((node) => !deletedIds.has(String(node.id))));
        pushNotification({ type: 'success', message: 'Asset taxonomy removed' });
      } catch (error) {
        void error;
        pushNotification({ type: 'error', message: 'Failed to remove asset taxonomy' });
      }
    };

    void removeAssetTaxonomy();
  };

  const columns = [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1.4,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, height: '100%', justifyContent: 'center', py: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.type}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'institution',
        headerName: 'Institution',
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2">{row.institution}</Typography>
          </Box>
        ),
      },
      {
        field: 'totalInvested',
        headerName: 'Invested',
        width: 150,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, height: '100%', justifyContent: 'center', py: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {formatInvestmentCurrency(row.totalInvested)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.currentValue ? `Current ${formatInvestmentCurrency(row.currentValue)}` : 'No current value'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'category',
        headerName: 'Category',
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2">{getInvestmentCategoryLabel(row.category, taxonomyNodes)}</Typography>
          </Box>
        ),
      },
      {
        field: 'maturityDate',
        headerName: 'Maturity',
        flex: 1,
        minWidth: 160,
        sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2">
              {formatInvestmentDate(row.maturityDate)}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <StatusChip label={row.status} tone={getInvestmentStatusTone(row.status)} />
          </Box>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        flex: 0.8,
        minWidth: 160,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
            <IconButton 
              size="small" 
              variant="contained"
              disableElevation
              onClick={() => openViewDrawer(row)} 
              aria-label={`View ${row.name}`}
              sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
            >
              <Icon path={mdiEyeOutline} size={0.8} />
            </IconButton>
            <IconButton 
              size="small" 
              variant="contained"
              disableElevation
              onClick={() => openEditDrawer(row)} 
              aria-label={`Edit ${row.name}`}
              sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
            >
              <Icon path={mdiPencilOutline} size={0.8} />
            </IconButton>
            <IconButton 
              size="small" 
              variant="contained"
              disableElevation
              color="error"
              onClick={() => setDeleteTarget(row)} 
              aria-label={`Delete ${row.name}`}
              sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
            >
              <Icon path={mdiDeleteOutline} size={0.8} />
            </IconButton>
          </Box>
        ),
      },
    ];

  const renderDashboardView = () => {
    const activeTimeSeriesData = selectedYearForDrill ? monthlyTimeSeriesData : yearlyTimeSeriesData;

    if (investments.length === 0) {
      return (
        <Stack spacing={2}>
          <SectionCard
            title="Investment Dashboard"
            subtitle="Track long-term assets, contributions, and maturity timelines from one place."
            empty
            emptyState={{
              title: 'No investments added yet',
              description: 'Add your first investment to unlock portfolio insights, allocation mix, and scheduled contribution tracking.',
              actionLabel: 'Add Investment',
              onAction: openCreateDrawer,
            }}
          >
            <Box />
          </SectionCard>
        </Stack>
      );
    }

    return (
    <Stack spacing={2}>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
        <KpiCard title="Total Invested Amount" value={formatInvestmentCurrency(dashboardKpis.totalInvested)} icon={<Icon path={mdiTrendingUp} size={1} />} />
        <Paper sx={{ p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Current Portfolio Value
            </Typography>
            <Icon path={mdiTrendingUp} size={0.9} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>
            {formatInvestmentCurrency(dashboardKpis.totalCurrentValue)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 700, 
                color: dashboardKpis.totalReturn >= 0 ? '#10b981' : '#ef4444',
              }}
            >
              {dashboardKpis.totalReturn >= 0 ? '+' : ''}{formatInvestmentCurrency(dashboardKpis.totalReturn)}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 700,
                color: dashboardKpis.returnPercentage >= 0 ? '#10b981' : '#ef4444',
              }}
            >
              ({dashboardKpis.returnPercentage >= 0 ? '+' : ''}{dashboardKpis.returnPercentage.toFixed(2)}%)
            </Typography>
          </Box>
        </Paper>
        <KpiCard title="Upcoming Maturity" value={formatInvestmentCurrency(dashboardKpis.upcomingMaturity)} icon={<Icon path={mdiCalendarClockOutline} size={1} />} />
        <KpiCard title="Insurance Cover" value={formatInvestmentCurrency(dashboardKpis.insuranceCover)} icon={<Icon path={mdiShieldCheckOutline} size={1} />} />
      </Box>

      <SectionCard
        title="Investment Timeline"
        subtitle="Distribution of total invested by category over time. Click year to see monthly breakdown."
        empty={activeTimeSeriesData.length === 0}
        emptyState={{
          title: 'No investment timeline data',
          description: 'Investments with valid start dates will appear here over time.',
        }}
      >
        <TimeSeriesVisualization
          data={activeTimeSeriesData}
          onDrill={setSelectedYearForDrill}
          onBack={() => setSelectedYearForDrill(null)}
          isDrillMode={Boolean(selectedYearForDrill)}
          formatValue={formatInvestmentCurrency}
          categoryLabelMap={categoryLabelMap}
        />
      </SectionCard>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.3fr 1fr 1fr' }, gap: 2 }}>
        <SectionCard
          title="Current Value Snapshot"
          subtitle="Highest-value assets based on the latest stored values."
          empty={topCurrentValueItems.length === 0}
          emptyState={{
            title: 'No current value snapshot',
            description: 'Assets with captured current values will surface here.',
          }}
        >
            <List disablePadding>
              {topCurrentValueItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListItem disableGutters sx={{ py: 1.5 }}>
                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>}
                      secondary={`${item.institution} • ${item.type} • ${formatInvestmentDate(item.lastValuationAt || item.startDate)}`}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatInvestmentCurrency(item.currentValue || item.totalInvested)}
                    </Typography>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
        </SectionCard>

        <SectionCard
          title="Allocation Mix"
          subtitle="Where the current invested base is concentrated."
          empty={categoryBreakdown.length === 0}
          emptyState={{
            title: 'No allocation data',
            description: 'Add investments to see category-level concentration.',
            actionLabel: 'Add Investment',
            onAction: openCreateDrawer,
          }}
        >
            <AllocationDonutChart data={categoryBreakdown} total={dashboardKpis.totalInvested} formatValue={formatInvestmentCurrency} />
        </SectionCard>

        <SectionCard
          title="Upcoming Contributions"
          subtitle="Scheduled recurring payments due on active investments."
          empty={upcomingContributions.length === 0}
          emptyState={{
            title: 'No upcoming contributions',
            description: 'Active investments with recurring schedules will appear here.',
          }}
        >
            <List disablePadding>
              {upcomingContributions.map((item, index) => {
                const dueDate = item.activeContributionPlan.nextDueDate;
                const daysUntil = dayjs(dueDate).startOf('day').diff(dayjs().startOf('day'), 'day');
                const isOverdue = daysUntil < 0;
                const isDueSoon = daysUntil >= 0 && daysUntil <= 7;
                return (
                  <React.Fragment key={`${item.id}-contribution`}>
                    {index > 0 ? <Divider /> : null}
                    <ListItem disableGutters sx={{ py: 1.25 }}>
                      <ListItemText
                        disableTypography
                        primary={<Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25, flexWrap: 'wrap' }}>
                            <Typography component="span" variant="caption" color="text.secondary">
                              {item.institution} • {item.activeContributionPlan.cadenceInterval > 1 ? `every ${item.activeContributionPlan.cadenceInterval} ` : ''}{item.activeContributionPlan.cadenceUnit}
                            </Typography>
                            <Chip
                              size="small"
                              label={isOverdue ? 'Overdue' : isDueSoon ? `In ${daysUntil}d` : formatInvestmentDate(dueDate)}
                              color={isOverdue ? 'error' : isDueSoon ? 'warning' : 'default'}
                              sx={{ height: 18, fontSize: 11 }}
                            />
                          </Box>
                        }
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {formatInvestmentCurrency(item.activeContributionPlan.amount)}
                        </Typography>
                        <AppButton
                          size="small"
                          variant="contained"
                          onClick={() => openRecordContributionModal(item, item.activeContributionPlan)}
                          sx={{ minWidth: 80, height: 28 }}
                        >
                          Record
                        </AppButton>
                      </Box>
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
        </SectionCard>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 2 }}>
        <SectionCard
          title="Upcoming Maturity"
          subtitle="Assets nearing maturity or payout windows."
          empty={upcomingMaturityItems.length === 0}
          emptyState={{
            title: 'No maturities due',
            description: 'Maturing deposits, policies, and certificates will appear here.',
          }}
        >
            <List disablePadding>
              {upcomingMaturityItems.map((item, index) => (
                <React.Fragment key={`${item.id}-maturity-card`}>
                  {index > 0 ? <Divider /> : null}
                  <ListItem disableGutters sx={{ py: 1.5 }}>
                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>}
                      secondary={`${item.institution} • ${item.type} • ${formatInvestmentDate(item.maturityDate)}`}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatInvestmentCurrency(item.currentValue || item.totalInvested)}
                    </Typography>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
        </SectionCard>

        <SectionCard
          title="Recent Investments"
          subtitle="The latest additions to the organizer."
          empty={recentInvestments.length === 0}
          emptyState={{
            title: 'No investments added yet',
            actionLabel: 'Add Investment',
            onAction: openCreateDrawer,
          }}
        >
            <Stack spacing={1.25}>
              {recentInvestments.map((item) => (
                <Paper key={item.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {item.institution} • {item.type}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={item.status || 'Active'} />
                        <Chip size="small" variant="outlined" label={getInvestmentCategoryLabel(item.category, taxonomyNodes)} />
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 800 }}>{formatInvestmentCurrency(item.totalInvested)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Added {formatInvestmentDate(item.createdAt || item.startDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Stack>
        </SectionCard>
      </Box>
    </Stack>
    );
  };

  const renderAssetsView = () => (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
        <KpiCard title="Tracked Assets" value={filteredInvestments.length} icon={<Icon path={mdiBankOutline} size={1} />} />
        <KpiCard title="Active Assets" value={filteredInvestments.filter((item) => item.status === 'active').length} icon={<Icon path={mdiCheckCircleOutline} size={1} />} />
        <KpiCard title="Maturity Tracked" value={filteredInvestments.filter((item) => item.maturityDate).length} icon={<Icon path={mdiCalendarClockOutline} size={1} />} />
        <KpiCard title="Insured Assets" value={filteredInvestments.filter((item) => Number(item.insuranceCover || 0) > 0).length} icon={<Icon path={mdiShieldCheckOutline} size={1} />} />
      </Box>

      <FilterBar onReset={handleResetFilters}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, type, institution, or reference" />
        <Select size="small" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} fullWidth>
          {STATUS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </Select>
        <Select size="small" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} fullWidth>
          {categoryOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </Select>
      </FilterBar>

      <SectionCard
        title="Investment Assets"
        subtitle="Primary CRUD workspace for all holdings, contribution schedules, maturity dates, and attached notes."
        action={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <AppButton variant="outlined" onClick={openAssetTaxonomyDrawer}>
              Manage Assets
            </AppButton>
            {/* <AppButton variant="contained" onClick={openCreateDrawer}>
              <Icon path={mdiPlus} size={0.8} style={{ marginRight: 8 }} />
              Add Investment
            </AppButton> */}
          </Box>
        }
        empty={filteredInvestments.length === 0}
        emptyState={
          isFirstInvestmentSetup
            ? {
                title: 'No investments added yet',
                description: 'Add your first investment to start tracking value, maturity, and recurring contributions.',
                actionLabel: 'Add Investment',
                onAction: openCreateDrawer,
              }
            : {
                title: 'No investments match current filters',
                description: 'Try broadening filters or add a new investment to expand your portfolio list.',
                actionLabel: 'Add Investment',
                onAction: openCreateDrawer,
              }
        }
      >
        <DataTable 
          rows={filteredInvestments} 
          columns={columns} 
          autoHeight={false} 
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }} 
          sx={{ '& .MuiDataGrid-row': { minHeight: 64 } }} 
          getRowHeight={() => 'auto'} 
        />
      </SectionCard>
    </Stack>
  );

  const renderCalendarView = () => {
    const monthKeys = Object.keys(calendarGroups);

    return (
      <Stack spacing={2}>
        <SectionCard
          title="Investment Calendar"
          subtitle="A forward-looking agenda of contributions, maturity events, and policy dates."
          empty={monthKeys.length === 0}
          emptyState={{
            title: 'No upcoming calendar actions',
            description: 'Assets with future maturity dates and scheduled contributions will appear in this agenda view.',
          }}
        >
            <Stack spacing={2}>
              {monthKeys.map((monthKey) => (
                <Paper key={monthKey} variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                    {monthKey}
                  </Typography>
                  <Stack spacing={1.25}>
                    {calendarGroups[monthKey].map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                          p: 1.5,
                          borderRadius: 1,
                          backgroundColor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            {item.subtitle}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Chip
                            size="small"
                            color={item.type === 'Maturity' ? 'warning' : 'info'}
                            label={item.type}
                            sx={{ mb: 0.75 }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {formatInvestmentDate(item.date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatInvestmentCurrency(item.amount)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
        </SectionCard>
      </Stack>
    );
  };

  return (
    <Box sx={{ pb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Investments
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 760 }}>
            Organize mutual funds, deposits, retirement accounts, insurance policies, metals, and other long-term assets in one operational workspace.
          </Typography>
        </Box>

        {!loading && !isFirstInvestmentSetup ? (
          <Paper variant="outlined" sx={{ p: 0.5, display: 'inline-flex', gap: 0.5, borderRadius: 1, flexWrap: 'wrap' }}>
            {VIEW_OPTIONS.map((option) => {
              const selected = activeView === option.value;
              return (
                <AppButton
                  key={option.value}
                  variant={selected ? 'contained' : 'text'}
                  onClick={() => setActiveView(option.value)}
                  sx={{ minWidth: 110 }}
                >
                  {option.label}
                </AppButton>
              );
            })}
          </Paper>
        ) : null}
      </Box>

      {loading ? <Typography color="text.secondary">Loading investments...</Typography> : null}
      {!loading && isFirstInvestmentSetup ? (
        <Box
          sx={{
            minHeight: { xs: 'calc(100dvh - 240px)', md: 'calc(100dvh - 220px)' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'background.paper',
            px: 2,
            py: 3,
          }}
        >
          <EmptyState
            title="No investments added yet"
            description="Add your first investment to unlock portfolio insights, allocation mix, and scheduled contribution tracking."
            actionLabel="Add Investment"
            onAction={openCreateDrawer}
          />
        </Box>
      ) : null}
      {!loading && !isFirstInvestmentSetup && activeView === 'dashboard' ? renderDashboardView() : null}
      {!loading && !isFirstInvestmentSetup && activeView === 'assets' ? renderAssetsView() : null}
      {!loading && !isFirstInvestmentSetup && activeView === 'calendar' ? renderCalendarView() : null}

      <InvestmentFormDrawer
        open={drawerOpen && drawerMode !== 'view'}
        onClose={closeInvestmentDrawer}
        onSubmit={handleSaveInvestment}
        initialValues={drawerMode === 'edit' ? selectedInvestment : null}
        accounts={accounts}
        taxonomyNodes={taxonomyNodes}
        title={drawerMode === 'edit' ? 'Edit Investment' : 'Add Investment'}
        submitLabel={drawerMode === 'edit' ? 'Update' : 'Add'}
      />

      <InvestmentViewDrawer
        open={drawerOpen && drawerMode === 'view'}
        onClose={closeInvestmentDrawer}
        investment={selectedInvestment}
        taxonomyNodes={taxonomyNodes}
        onEdit={openEditDrawer}
      />

      <InvestmentAssetTaxonomyFormDrawer
        open={assetTaxonomyDrawerOpen}
        onClose={closeAssetTaxonomyDrawer}
        onSubmit={handleSaveAssetTaxonomy}
        onDelete={handleDeleteAssetTaxonomy}
        taxonomyNodes={taxonomyNodes}
        submitError={taxonomyFormError}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete investment"
        description={deleteTarget ? `Remove ${deleteTarget.name} from the organizer? This only affects the current MVP dataset.` : ''}
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteInvestment}
      />

      <RecordContributionModal
        open={recordContributionModalOpen}
        onClose={closeRecordContributionModal}
        investment={selectedContributionForRecording?.investment}
        contributionPlan={selectedContributionForRecording?.contributionPlan}
        onContributionRecorded={handleContributionRecorded}
      />
    </Box>
  );
}