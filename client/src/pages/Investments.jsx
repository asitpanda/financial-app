import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@mdi/react';
import {
  mdiAlertCircleOutline,
  mdiBankOutline,
  mdiCalendarClockOutline,
  mdiCashSync,
  mdiCheckCircleOutline,
  mdiDeleteOutline,
  mdiEyeOutline,
  mdiFlagOutline,
  mdiGold,
  mdiPlus,
  mdiShieldCheckOutline,
  mdiTrendingUp,
  mdiWalletOutline,
  mdiPencilOutline,
} from '@mdi/js';
import {
  alpha,
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
import { getGoals } from '../api/goals';
import { createInvestment, deleteInvestment, getInvestments, updateInvestment } from '../api/investments';
import AppButton from '../components/common/AppButton';
import {
  DataTable,
  EmptyState,
  FilterBar,
  KpiCard,
  LabelCurrencyField,
  LabeledDateField,
  LabeledSelectField,
  LabeledTextField,
  LabeledTextareaField,
  SearchBar,
  SectionCard,
  StatusChip,
} from '../components/common';
import ConfirmDialog from '../components/dialogs/ConfirmDialog';
import { AppDrawer } from '../components/drawers';
import { useHeaderAction } from '../hooks/useHeaderAction';
import { useNotificationStore } from '../store/notificationStore';

const VIEW_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'assets', label: 'Assets' },
  { value: 'calendar', label: 'Calendar' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'market', label: 'Market' },
  { value: 'deposits', label: 'Deposits' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'metals', label: 'Metals' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'matured', label: 'Matured' },
  { value: 'closed', label: 'Closed' },
];

const CONTRIBUTION_FILTER_OPTIONS = [
  { value: 'all', label: 'All Contributions' },
  { value: 'one-time', label: 'One-time' },
  { value: 'recurring', label: 'Recurring' },
];

const CONTRIBUTION_TYPE_OPTIONS = [
  {
    value: 'one-time',
    title: 'One-time Investment',
    description: 'FD, lump sum MF, stocks, bonds, and physical gold purchases.',
  },
  {
    value: 'recurring',
    title: 'Recurring Contribution',
    description: 'SIP, LIC premium, RD installment, PPF, EPF, and NPS contributions.',
  },
];

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

const INVESTMENT_TYPE_GROUPS = [
  {
    key: 'market',
    label: 'Market',
    types: ['Mutual Fund', 'Stocks'],
  },
  {
    key: 'deposits',
    label: 'Deposits',
    types: ['Fixed Deposit', 'Recurring Deposit', 'NSC', 'Bonds'],
  },
  {
    key: 'retirement',
    label: 'Retirement',
    types: ['EPF', 'PPF', 'NPS'],
  },
  {
    key: 'insurance',
    label: 'Insurance',
    types: ['LIC'],
  },
  {
    key: 'metals',
    label: 'Precious Metals',
    types: ['Gold'],
  },
  {
    key: 'other',
    label: 'Other',
    types: ['Other Investment'],
  },
];

const INVESTMENT_TYPE_META = INVESTMENT_TYPE_GROUPS.flatMap((group) =>
  group.types.map((type) => ({
    type,
    category: group.key,
    categoryLabel: group.label,
  }))
).reduce((acc, item) => {
  acc[item.type] = item;
  return acc;
}, {});

const createEmptyForm = () => ({
  name: '',
  type: 'Mutual Fund',
  category: 'market',
  institution: '',
  totalInvested: '',
  currentValue: '',
  startDate: dayjs(),
  goalId: '',
  status: 'active',
  contributionType: 'recurring',
  investmentAmount: '',
  investmentDate: dayjs(),
  maturityDate: null,
  contributionAmount: '',
  frequency: 'monthly',
  contributionDate: dayjs(),
  nextDueDate: dayjs(),
  endDate: null,
  referenceNumber: '',
  insuranceCover: '',
  documents: '',
  notes: '',
});

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatDate = (value) => {
  if (!value) return 'Not set';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YYYY') : 'Not set';
};

const isWithinDays = (value, days) => {
  if (!value) return false;
  const parsed = dayjs(value).startOf('day');
  const today = dayjs().startOf('day');
  return parsed.isAfter(today.subtract(1, 'day')) && parsed.isBefore(today.add(days + 1, 'day'));
};

const getStatusTone = (status) => {
  if (status === 'active') return 'success';
  if (status === 'matured') return 'warning';
  if (status === 'closed') return 'default';
  return 'default';
};

const getContributionLabel = (investment) => {
  if (investment.contributionType === 'recurring') {
    const frequencyLabel = FREQUENCY_OPTIONS.find((option) => option.value === investment.frequency)?.label || investment.frequency;
    return `${formatCurrency(investment.contributionAmount)} • ${frequencyLabel}`;
  }

  return `${formatCurrency(investment.investmentAmount || investment.totalInvested)} • One-time`;
};

const normalizeDateValue = (value) => (value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD') : null);

const getInvestmentTypeMeta = (type) => INVESTMENT_TYPE_META[type] || { category: 'other', categoryLabel: 'Other' };

const buildFormFromInvestment = (investment) => ({
  name: investment.name || '',
  type: investment.type || 'Mutual Fund',
  category: investment.category || getInvestmentTypeMeta(investment.type).category,
  institution: investment.institution || '',
  totalInvested: investment.totalInvested ? String(investment.totalInvested) : '',
  currentValue: investment.currentValue ? String(investment.currentValue) : '',
  startDate: investment.startDate ? dayjs(investment.startDate) : dayjs(),
  goalId: investment.goalId || '',
  status: investment.status || 'active',
  contributionType: investment.contributionType || 'one-time',
  investmentAmount: investment.investmentAmount ? String(investment.investmentAmount) : '',
  investmentDate: investment.investmentDate ? dayjs(investment.investmentDate) : dayjs(),
  maturityDate: investment.maturityDate ? dayjs(investment.maturityDate) : null,
  contributionAmount: investment.contributionAmount ? String(investment.contributionAmount) : '',
  frequency: investment.frequency || 'monthly',
  contributionDate: investment.contributionDate ? dayjs(investment.contributionDate) : dayjs(),
  nextDueDate: investment.nextDueDate ? dayjs(investment.nextDueDate) : dayjs(),
  endDate: investment.endDate ? dayjs(investment.endDate) : null,
  referenceNumber: investment.referenceNumber || '',
  insuranceCover: investment.insuranceCover ? String(investment.insuranceCover) : '',
  documents: investment.documents || '',
  notes: investment.notes || '',
});

const buildInvestmentFromForm = (form, existingId) => {
  const typeMeta = getInvestmentTypeMeta(form.type);

  return {
    id: existingId || `inv-${Date.now()}`,
    name: form.name.trim(),
    type: form.type,
    category: typeMeta.category,
    institution: form.institution.trim(),
    totalInvested: Number(form.totalInvested || 0),
    currentValue: form.currentValue ? Number(form.currentValue) : Number(form.totalInvested || 0),
    startDate: normalizeDateValue(form.startDate),
    goalId: form.goalId || '',
    status: form.status,
    contributionType: form.contributionType,
    investmentAmount: form.contributionType === 'one-time' ? Number(form.investmentAmount || form.totalInvested || 0) : undefined,
    investmentDate: form.contributionType === 'one-time' ? normalizeDateValue(form.investmentDate) : null,
    maturityDate: normalizeDateValue(form.maturityDate),
    contributionAmount: form.contributionType === 'recurring' ? Number(form.contributionAmount || 0) : undefined,
    frequency: form.contributionType === 'recurring' ? form.frequency : null,
    contributionDate: form.contributionType === 'recurring' ? normalizeDateValue(form.contributionDate) : null,
    nextDueDate: form.contributionType === 'recurring' ? normalizeDateValue(form.nextDueDate) : null,
    endDate: form.contributionType === 'recurring' ? normalizeDateValue(form.endDate) : null,
    insuranceCover: form.insuranceCover ? Number(form.insuranceCover) : 0,
    referenceNumber: form.referenceNumber.trim(),
    documents: form.documents.trim(),
    notes: form.notes.trim(),
    createdAt: existingId ? undefined : dayjs().format('YYYY-MM-DD'),
  };
};

const validateForm = (form) => {
  const nextErrors = {};

  if (!form.name.trim()) nextErrors.name = 'Investment name is required';
  if (!form.institution.trim()) nextErrors.institution = 'Institution is required';
  if (!form.totalInvested) nextErrors.totalInvested = 'Total invested amount is required';
  if (!form.startDate || !dayjs(form.startDate).isValid()) nextErrors.startDate = 'Start date is required';

  if (form.contributionType === 'one-time') {
    if (!form.investmentAmount) nextErrors.investmentAmount = 'Investment amount is required';
    if (!form.investmentDate || !dayjs(form.investmentDate).isValid()) nextErrors.investmentDate = 'Investment date is required';
  }

  if (form.contributionType === 'recurring') {
    if (!form.contributionAmount) nextErrors.contributionAmount = 'Contribution amount is required';
    if (!form.nextDueDate || !dayjs(form.nextDueDate).isValid()) nextErrors.nextDueDate = 'Next due date is required';
  }

  return nextErrors;
};

export default function Investments() {
  const [activeView, setActiveView] = useState('dashboard');
  const [investments, setInvestments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [contributionFilter, setContributionFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create');
  const [selectedInvestmentId, setSelectedInvestmentId] = useState(null);
  const [form, setForm] = useState(() => createEmptyForm());
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [goalOptions, setGoalOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [goals, investmentList] = await Promise.all([getGoals(), getInvestments()]);
        if (active) {
          setGoalOptions(Array.isArray(goals) ? goals : []);
          setInvestments(Array.isArray(investmentList) ? investmentList : []);
        }
      } catch (error) {
        void error;
        if (active) {
          setGoalOptions([]);
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
    setDrawerMode('create');
    setSelectedInvestmentId(null);
    setForm(createEmptyForm());
    setErrors({});
    setDrawerOpen(true);
  };

  useHeaderAction('investments', {
    label: 'Investment',
    onClick: openCreateDrawer,
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
      const matchesContribution = contributionFilter === 'all' || investment.contributionType === contributionFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesContribution;
    });
  }, [categoryFilter, contributionFilter, investments, search, statusFilter]);

  const dashboardKpis = useMemo(() => {
    const totalInvested = investments.reduce((sum, item) => sum + Number(item.totalInvested || 0), 0);
    const upcomingContributions = investments
      .filter((item) => item.contributionType === 'recurring' && item.status === 'active' && isWithinDays(item.nextDueDate, 30))
      .reduce((sum, item) => sum + Number(item.contributionAmount || 0), 0);
    const upcomingMaturity = investments
      .filter((item) => item.status === 'active' && isWithinDays(item.maturityDate, 90))
      .reduce((sum, item) => sum + Number(item.currentValue || item.totalInvested || 0), 0);
    const insuranceCover = investments
      .filter((item) => item.category === 'insurance' && item.status === 'active')
      .reduce((sum, item) => sum + Number(item.insuranceCover || 0), 0);

    return {
      totalInvestments: investments.length,
      totalInvested,
      upcomingContributions,
      upcomingMaturity,
      insuranceCover,
    };
  }, [investments]);

  const upcomingContributionItems = useMemo(() => {
    return [...investments]
      .filter((item) => item.contributionType === 'recurring' && item.status === 'active' && item.nextDueDate)
      .sort((left, right) => dayjs(left.nextDueDate).valueOf() - dayjs(right.nextDueDate).valueOf())
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

  const categoryBreakdown = useMemo(() => {
    const totals = investments.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Number(item.totalInvested || 0);
      return acc;
    }, {});

    return CATEGORY_OPTIONS.filter((option) => option.value !== 'all')
      .map((option) => ({
        label: option.label,
        value: totals[option.value] || 0,
      }))
      .filter((item) => item.value > 0)
      .sort((left, right) => right.value - left.value);
  }, [investments]);

  const calendarItems = useMemo(() => {
    return investments
      .flatMap((investment) => {
        const items = [];

        if (investment.contributionType === 'recurring' && investment.nextDueDate && investment.status === 'active') {
          items.push({
            id: `${investment.id}-due`,
            title: investment.name,
            type: 'Contribution',
            date: investment.nextDueDate,
            amount: investment.contributionAmount,
            subtitle: `${investment.institution} • ${investment.type}`,
          });
        }

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

  const goalLookup = useMemo(() => {
    return goalOptions.reduce((acc, goal) => {
      const key = goal._id || goal.id;
      if (key) acc[key] = goal.name;
      return acc;
    }, {});
  }, [goalOptions]);

  const openEditDrawer = (investment) => {
    setDrawerMode('edit');
    setSelectedInvestmentId(investment.id);
    setForm(buildFormFromInvestment(investment));
    setErrors({});
    setDrawerOpen(true);
  };

  const openViewDrawer = (investment) => {
    setDrawerMode('view');
    setSelectedInvestmentId(investment.id);
    setForm(buildFormFromInvestment(investment));
    setErrors({});
    setDrawerOpen(true);
  };

  const closeInvestmentDrawer = () => {
    setDrawerOpen(false);
    setSelectedInvestmentId(null);
    setErrors({});
  };

  const handleFormChange = (field, value) => {
    setForm((current) => {
      const nextForm = { ...current, [field]: value };
      if (field === 'type') {
        nextForm.category = getInvestmentTypeMeta(value).category;
      }
      return nextForm;
    });

    setErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setContributionFilter('all');
  };

  const handleSaveInvestment = () => {
    const persistInvestment = async () => {
      const validationErrors = validateForm(form);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      const nextInvestment = buildInvestmentFromForm(form, drawerMode === 'edit' ? selectedInvestmentId : null);

      try {
        if (drawerMode === 'edit') {
          const updated = await updateInvestment(selectedInvestmentId, nextInvestment);
          setInvestments((current) => current.map((item) => (item.id === selectedInvestmentId ? updated : item)));
        } else {
          const created = await createInvestment(nextInvestment);
          setInvestments((current) => [created, ...current]);
        }

        pushNotification({
          type: 'success',
          message: drawerMode === 'edit' ? 'Investment updated' : 'Investment added',
        });
        closeInvestmentDrawer();
      } catch (error) {
        void error;
        pushNotification({
          type: 'error',
          message: drawerMode === 'edit' ? 'Failed to update investment' : 'Failed to add investment',
        });
      }
    };

    void persistInvestment();
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

  const columns = [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1.4,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Box>
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
      },
      {
        field: 'totalInvested',
        headerName: 'Invested',
        width: 150,
        renderCell: ({ row }) => (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {formatCurrency(row.totalInvested)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.currentValue ? `Current ${formatCurrency(row.currentValue)}` : 'No current value'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'contribution',
        headerName: 'Contribution',
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography variant="body2">{getContributionLabel(row)}</Typography>
        ),
      },
      {
        field: 'nextAction',
        headerName: 'Next Due / Maturity',
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: ({ row }) => (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.nextDueDate ? formatDate(row.nextDueDate) : formatDate(row.maturityDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.nextDueDate ? 'Recurring due' : row.maturityDate ? 'Maturity date' : 'No upcoming action'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => <StatusChip label={row.status} tone={getStatusTone(row.status)} />,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 140,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" onClick={() => openViewDrawer(row)} aria-label={`View ${row.name}`}>
              <Icon path={mdiEyeOutline} size={0.8} />
            </IconButton>
            <IconButton size="small" onClick={() => openEditDrawer(row)} aria-label={`Edit ${row.name}`}>
              <Icon path={mdiPencilOutline} size={0.8} />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)} aria-label={`Delete ${row.name}`}>
              <Icon path={mdiDeleteOutline} size={0.8} />
            </IconButton>
          </Box>
        ),
      },
    ];

  const drawerFooter = drawerMode === 'view' ? (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
      <AppButton variant="outlined" onClick={closeInvestmentDrawer} sx={{ minWidth: 120 }}>
        Close
      </AppButton>
      <AppButton
        variant="contained"
        onClick={() => {
          if (selectedInvestment) {
            openEditDrawer(selectedInvestment);
          }
        }}
        sx={{ minWidth: 160 }}
      >
        Edit Investment
      </AppButton>
    </Box>
  ) : (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
      <AppButton variant="outlined" onClick={closeInvestmentDrawer} sx={{ minWidth: 120 }}>
        Cancel
      </AppButton>
      <AppButton variant="contained" onClick={handleSaveInvestment} sx={{ minWidth: 160 }}>
        Save Investment
      </AppButton>
    </Box>
  );

  const renderDashboardView = () => (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.25, md: 3 },
          borderRadius: 1,
          overflow: 'hidden',
          background: (theme) =>
            `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.08)} 60%, ${alpha(theme.palette.warning.main, 0.06)} 100%)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2, fontWeight: 700 }}>
              Investment Organizer
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 800, maxWidth: 760 }}>
              One workspace for long-term assets, recurring contributions, maturity tracking, and important investment reminders.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, maxWidth: 780, lineHeight: 1.7 }}>
              This MVP is intentionally operations-focused. It helps users organize investments, stay ahead of contribution and maturity events, and connect holdings with goals without depending on live market feeds or broker integrations.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <AppButton variant="contained" onClick={openCreateDrawer}>
              <Icon path={mdiPlus} size={0.8} style={{ marginRight: 8 }} />
              Add Investment
            </AppButton>
            <AppButton variant="outlined" onClick={() => setActiveView('calendar')}>
              View Calendar
            </AppButton>
          </Stack>
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' }, gap: 1.5 }}>
        <KpiCard title="Total Investments" value={dashboardKpis.totalInvestments} icon={<Icon path={mdiWalletOutline} size={1} />} />
        <KpiCard title="Total Invested Amount" value={formatCurrency(dashboardKpis.totalInvested)} icon={<Icon path={mdiTrendingUp} size={1} />} />
        <KpiCard title="Upcoming Contributions" value={formatCurrency(dashboardKpis.upcomingContributions)} icon={<Icon path={mdiCashSync} size={1} />} />
        <KpiCard title="Upcoming Maturity" value={formatCurrency(dashboardKpis.upcomingMaturity)} icon={<Icon path={mdiCalendarClockOutline} size={1} />} />
        <KpiCard title="Insurance Cover" value={formatCurrency(dashboardKpis.insuranceCover)} icon={<Icon path={mdiShieldCheckOutline} size={1} />} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.3fr 1fr' }, gap: 2 }}>
        <SectionCard title="Upcoming Contributions" subtitle="Recurring contributions due soon across SIPs, deposits, retirement, and insurance.">
          {upcomingContributionItems.length ? (
            <List disablePadding>
              {upcomingContributionItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListItem disableGutters sx={{ py: 1.5 }}>
                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>}
                      secondary={`${item.institution} • ${item.type} • ${formatDate(item.nextDueDate)}`}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatCurrency(item.contributionAmount)}
                    </Typography>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          ) : (
            <EmptyState text="No upcoming contributions" subText="Recurring investments will surface here when their next due date approaches." />
          )}
        </SectionCard>

        <SectionCard title="Allocation Mix" subtitle="Where the current invested base is concentrated.">
          <Stack spacing={1.25}>
            {categoryBreakdown.map((item) => (
              <Box key={item.label}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, mb: 0.6 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency(item.value)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: 'action.hover',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${(item.value / Math.max(dashboardKpis.totalInvested, 1)) * 100}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #0f766e 0%, #14b8a6 100%)',
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </SectionCard>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 2 }}>
        <SectionCard title="Upcoming Maturity" subtitle="Assets nearing maturity or payout windows.">
          {upcomingMaturityItems.length ? (
            <List disablePadding>
              {upcomingMaturityItems.map((item, index) => (
                <React.Fragment key={`${item.id}-maturity-card`}>
                  {index > 0 ? <Divider /> : null}
                  <ListItem disableGutters sx={{ py: 1.5 }}>
                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>}
                      secondary={`${item.institution} • ${item.type} • ${formatDate(item.maturityDate)}`}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatCurrency(item.currentValue || item.totalInvested)}
                    </Typography>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          ) : (
            <EmptyState text="No maturities due" subText="Maturing deposits, policies, and certificates will appear here." />
          )}
        </SectionCard>

        <SectionCard title="Recent Investments" subtitle="The latest additions to the organizer.">
          {recentInvestments.length ? (
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
                        <Chip size="small" label={item.contributionType === 'recurring' ? 'Recurring' : 'One-time'} />
                        <Chip size="small" variant="outlined" label={CATEGORY_OPTIONS.find((option) => option.value === item.category)?.label || 'Other'} />
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 800 }}>{formatCurrency(item.totalInvested)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Added {formatDate(item.createdAt || item.startDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Stack>
          ) : (
            <EmptyState text="No investments added yet" actionLabel="Add Investment" onAction={openCreateDrawer} />
          )}
        </SectionCard>
      </Box>
    </Stack>
  );

  const renderAssetsView = () => (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
        <KpiCard title="Tracked Assets" value={filteredInvestments.length} icon={<Icon path={mdiBankOutline} size={1} />} />
        <KpiCard title="Active Assets" value={filteredInvestments.filter((item) => item.status === 'active').length} icon={<Icon path={mdiCheckCircleOutline} size={1} />} />
        <KpiCard title="Recurring Plans" value={filteredInvestments.filter((item) => item.contributionType === 'recurring').length} icon={<Icon path={mdiCashSync} size={1} />} />
        <KpiCard title="Goal Linked" value={filteredInvestments.filter((item) => item.goalId).length} icon={<Icon path={mdiFlagOutline} size={1} />} />
      </Box>

      <FilterBar onReset={handleResetFilters}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, type, institution, or reference" />
        <Select size="small" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} fullWidth>
          {STATUS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </Select>
        <Select size="small" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} fullWidth>
          {CATEGORY_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </Select>
        <Select size="small" value={contributionFilter} onChange={(event) => setContributionFilter(event.target.value)} fullWidth>
          {CONTRIBUTION_FILTER_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </Select>
      </FilterBar>

      <SectionCard
        title="Investment Assets"
        subtitle="Primary CRUD workspace for all holdings, contribution schedules, maturity dates, and attached notes."
        action={
          <AppButton variant="contained" onClick={openCreateDrawer}>
            <Icon path={mdiPlus} size={0.8} style={{ marginRight: 8 }} />
            Add Investment
          </AppButton>
        }
      >
        {filteredInvestments.length ? (
          <DataTable rows={filteredInvestments} columns={columns} autoHeight={false} initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }} />
        ) : (
          <EmptyState
            text="No investments match the current filters"
            subText="Try broadening the filters or add a new investment to start building the organizer."
            actionLabel="Add Investment"
            onAction={openCreateDrawer}
          />
        )}
      </SectionCard>
    </Stack>
  );

  const renderCalendarView = () => {
    const monthKeys = Object.keys(calendarGroups);

    return (
      <Stack spacing={2}>
        <SectionCard title="Investment Calendar" subtitle="A forward-looking agenda of contributions, maturity events, and policy dates.">
          {monthKeys.length ? (
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
                            color={item.type === 'Contribution' ? 'primary' : 'warning'}
                            label={item.type}
                            sx={{ mb: 0.75 }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {formatDate(item.date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(item.amount)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <EmptyState
              text="No upcoming calendar actions"
              subText="Add recurring or maturity-based investments and they will appear in this agenda view."
            />
          )}
        </SectionCard>
      </Stack>
    );
  };

  const isInsurance = getInvestmentTypeMeta(form.type).category === 'insurance';
  const referenceLabel = isInsurance ? 'Policy Number' : form.type === 'Mutual Fund' ? 'Folio Number' : form.type === 'Stocks' ? 'Demat / ISIN Reference' : 'Account / Certificate Reference';

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
      </Box>

      {loading ? <Typography color="text.secondary">Loading investments...</Typography> : null}
      {!loading && activeView === 'dashboard' ? renderDashboardView() : null}
      {!loading && activeView === 'assets' ? renderAssetsView() : null}
      {!loading && activeView === 'calendar' ? renderCalendarView() : null}

      <AppDrawer
        open={drawerOpen}
        onClose={closeInvestmentDrawer}
        title={drawerMode === 'create' ? 'Add Investment' : drawerMode === 'edit' ? 'Edit Investment' : selectedInvestment?.name || 'Investment Details'}
        subtitle={drawerMode === 'view' ? 'Review linked details, maturity dates, contribution plans, and notes.' : 'Capture the operational details needed to manage this investment end-to-end.'}
        width={760}
        footer={drawerFooter}
      >
        {drawerMode === 'view' && selectedInvestment ? (
          <Stack spacing={2}>
            <SectionCard title="Overview" subtitle={`${selectedInvestment.institution} • ${selectedInvestment.type}`}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">Total Invested</Typography>
                  <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800 }}>{formatCurrency(selectedInvestment.totalInvested)}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">Current Value</Typography>
                  <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800 }}>{formatCurrency(selectedInvestment.currentValue || selectedInvestment.totalInvested)}</Typography>
                </Paper>
              </Box>
            </SectionCard>

            <SectionCard title="Common Information">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Status</Typography><Box sx={{ mt: 0.75 }}><StatusChip label={selectedInvestment.status} tone={getStatusTone(selectedInvestment.status)} /></Box></Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Goal Link</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{goalLookup[selectedInvestment.goalId] || 'Not linked'}</Typography></Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Start Date</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{formatDate(selectedInvestment.startDate)}</Typography></Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Reference</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{selectedInvestment.referenceNumber || 'Not recorded'}</Typography></Paper>
              </Box>
            </SectionCard>

            <SectionCard title={selectedInvestment.contributionType === 'recurring' ? 'Contribution Schedule' : 'One-time Details'}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                {selectedInvestment.contributionType === 'recurring' ? (
                  <>
                    <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Contribution Amount</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{formatCurrency(selectedInvestment.contributionAmount)}</Typography></Paper>
                    <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Frequency</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{FREQUENCY_OPTIONS.find((option) => option.value === selectedInvestment.frequency)?.label || 'Not set'}</Typography></Paper>
                    <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Next Due Date</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{formatDate(selectedInvestment.nextDueDate)}</Typography></Paper>
                    <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">End Date</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{formatDate(selectedInvestment.endDate)}</Typography></Paper>
                  </>
                ) : (
                  <>
                    <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Investment Amount</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{formatCurrency(selectedInvestment.investmentAmount || selectedInvestment.totalInvested)}</Typography></Paper>
                    <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Investment Date</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{formatDate(selectedInvestment.investmentDate)}</Typography></Paper>
                    <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Maturity Date</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{formatDate(selectedInvestment.maturityDate)}</Typography></Paper>
                    <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Insurance Cover</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{formatCurrency(selectedInvestment.insuranceCover)}</Typography></Paper>
                  </>
                )}
              </Box>
            </SectionCard>

            <SectionCard title="Documents" subtitle="Stored as operational references in MVP.">
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                {selectedInvestment.documents || 'No document references added'}
              </Typography>
            </SectionCard>

            <SectionCard title="Notes">
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                {selectedInvestment.notes || 'No notes added'}
              </Typography>
            </SectionCard>
          </Stack>
        ) : (
          <Stack spacing={2.25}>
            <SectionCard title="Investment Type" subtitle="Choose the product family first so the drawer can adapt the operational fields.">
              <Stack spacing={2}>
                {INVESTMENT_TYPE_GROUPS.map((group) => (
                  <Box key={group.key}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                      {group.label}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1 }}>
                      {group.types.map((type) => {
                        const selected = form.type === type;
                        return (
                          <Paper
                            key={type}
                            variant="outlined"
                            onClick={() => handleFormChange('type', type)}
                            sx={{
                              p: 1.5,
                              borderRadius: 1,
                              cursor: 'pointer',
                              borderColor: selected ? 'primary.main' : 'divider',
                              backgroundColor: selected ? (theme) => alpha(theme.palette.primary.main, 0.08) : 'background.paper',
                              transition: 'border-color 160ms ease, background-color 160ms ease, transform 160ms ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                                transform: 'translateY(-1px)',
                              },
                            }}
                          >
                            <Typography sx={{ fontWeight: 700 }}>{type}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {group.label}
                            </Typography>
                          </Paper>
                        );
                      })}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </SectionCard>

            <SectionCard title="Contribution Type" subtitle="This controls whether the remaining schedule captures a one-time placement or a recurring commitment.">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
                {CONTRIBUTION_TYPE_OPTIONS.map((option) => {
                  const selected = form.contributionType === option.value;
                  return (
                    <Paper
                      key={option.value}
                      variant="outlined"
                      onClick={() => handleFormChange('contributionType', option.value)}
                      sx={{
                        p: 1.75,
                        borderRadius: 1,
                        cursor: 'pointer',
                        borderColor: selected ? 'primary.main' : 'divider',
                        backgroundColor: selected ? (theme) => alpha(theme.palette.primary.main, 0.08) : 'background.paper',
                      }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>{option.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6 }}>
                        {option.description}
                      </Typography>
                    </Paper>
                  );
                })}
              </Box>
            </SectionCard>

            <SectionCard title="Basic Information">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                <LabeledTextField labelText="Investment Name" value={form.name} onChange={(event) => handleFormChange('name', event.target.value)} errorMessage={errors.name} />
                <LabeledTextField labelText="Institution" value={form.institution} onChange={(event) => handleFormChange('institution', event.target.value)} errorMessage={errors.institution} />
                <LabelCurrencyField labelText="Total Invested" value={form.totalInvested} onValueChange={(value) => handleFormChange('totalInvested', value)} errorMessage={errors.totalInvested} />
                <LabelCurrencyField labelText="Current Value (Optional)" value={form.currentValue} onValueChange={(value) => handleFormChange('currentValue', value)} />
                <LabeledDateField labelText="Start Date" value={form.startDate} onChange={(value) => handleFormChange('startDate', value)} errorMessage={errors.startDate} />
                <LabeledSelectField
                  labelText="Goal (Optional)"
                  value={form.goalId}
                  onChange={(event) => handleFormChange('goalId', event.target.value)}
                  options={[
                    { value: '', label: 'Not linked' },
                    ...goalOptions.map((goal) => ({ value: goal._id || goal.id, label: goal.name })),
                  ]}
                />
                <LabeledSelectField
                  labelText="Status"
                  value={form.status}
                  onChange={(event) => handleFormChange('status', event.target.value)}
                  options={STATUS_OPTIONS.filter((option) => option.value !== 'all')}
                />
                <LabeledTextField labelText={referenceLabel} value={form.referenceNumber} onChange={(event) => handleFormChange('referenceNumber', event.target.value)} />
              </Box>
            </SectionCard>

            <SectionCard
              title={form.contributionType === 'recurring' ? 'Contribution Schedule' : 'One-time Details'}
              subtitle={form.contributionType === 'recurring' ? 'Capture the recurring plan so the organizer can surface next actions and reminders.' : 'Record the initial placement and any maturity or expiry dates.'}
            >
              {form.contributionType === 'recurring' ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                  <LabelCurrencyField labelText="Contribution Amount" value={form.contributionAmount} onValueChange={(value) => handleFormChange('contributionAmount', value)} errorMessage={errors.contributionAmount} />
                  <LabeledSelectField labelText="Frequency" value={form.frequency} onChange={(event) => handleFormChange('frequency', event.target.value)} options={FREQUENCY_OPTIONS} />
                  <LabeledDateField labelText="Contribution Date" value={form.contributionDate} onChange={(value) => handleFormChange('contributionDate', value)} />
                  <LabeledDateField labelText="Next Due Date" value={form.nextDueDate} onChange={(value) => handleFormChange('nextDueDate', value)} errorMessage={errors.nextDueDate} />
                  <LabeledDateField labelText="End Date (Optional)" value={form.endDate} onChange={(value) => handleFormChange('endDate', value)} />
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                  <LabelCurrencyField labelText="Investment Amount" value={form.investmentAmount} onValueChange={(value) => handleFormChange('investmentAmount', value)} errorMessage={errors.investmentAmount} />
                  <LabeledDateField labelText="Investment Date" value={form.investmentDate} onChange={(value) => handleFormChange('investmentDate', value)} errorMessage={errors.investmentDate} />
                  <LabeledDateField labelText="Maturity Date (Optional)" value={form.maturityDate} onChange={(value) => handleFormChange('maturityDate', value)} />
                  {isInsurance ? (
                    <LabelCurrencyField labelText="Insurance Cover" value={form.insuranceCover} onValueChange={(value) => handleFormChange('insuranceCover', value)} />
                  ) : null}
                </Box>
              )}
            </SectionCard>

            <SectionCard title="Investment Details" subtitle="Store operational details that matter later, not just the amount.">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                {isInsurance ? (
                  <LabelCurrencyField labelText="Insurance Cover" value={form.insuranceCover} onValueChange={(value) => handleFormChange('insuranceCover', value)} />
                ) : (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Icon path={form.type === 'Gold' ? mdiGold : mdiAlertCircleOutline} size={1} />
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>Context-aware details</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, lineHeight: 1.6 }}>
                        Use notes and documents to store folio references, bond certificates, locker details, or operational instructions specific to this asset.
                      </Typography>
                    </Box>
                  </Paper>
                )}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Icon path={mdiCheckCircleOutline} size={1} />
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>Reminder-ready structure</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, lineHeight: 1.6 }}>
                      The dashboard and calendar views automatically use contribution and maturity dates captured in this drawer.
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </SectionCard>

            <SectionCard title="Documents">
              <LabeledTextareaField
                labelText="Document References"
                value={form.documents}
                onChange={(event) => handleFormChange('documents', event.target.value)}
                helperText="Paste document names, folder paths, locker notes, or reference URLs for this investment."
              />
            </SectionCard>

            <SectionCard title="Notes">
              <LabeledTextareaField
                labelText="Internal Notes"
                value={form.notes}
                onChange={(event) => handleFormChange('notes', event.target.value)}
                helperText="Use this for action reminders, nominee context, or maturity instructions."
              />
            </SectionCard>
          </Stack>
        )}
      </AppDrawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete investment"
        description={deleteTarget ? `Remove ${deleteTarget.name} from the organizer? This only affects the current MVP dataset.` : ''}
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteInvestment}
      />
    </Box>
  );
}