import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@mdi/react';
import {
  mdiBankOutline,
  mdiCalendarClockOutline,
  mdiCheckCircleOutline,
  mdiDeleteOutline,
  mdiEyeOutline,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assetTaxonomyDrawerOpen, setAssetTaxonomyDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create');
  const [selectedInvestmentId, setSelectedInvestmentId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [taxonomyList, investmentList] = await Promise.all([getInvestmentAssetTaxonomy(), getInvestments()]);
        if (active) {
          const nextTaxonomyNodes = Array.isArray(taxonomyList) ? taxonomyList : [];
          setTaxonomyNodes(nextTaxonomyNodes);
          setInvestments(Array.isArray(investmentList) ? investmentList.map((item) => normalizeInvestmentForUi(item, nextTaxonomyNodes)) : []);
        }
      } catch (error) {
        void error;
        if (active) {
          setTaxonomyNodes([]);
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
    setDrawerOpen(true);
  };

  const openAssetTaxonomyDrawer = () => {
    setAssetTaxonomyDrawerOpen(true);
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

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, investments, search, statusFilter]);

  const dashboardKpis = useMemo(() => {
    const totalInvested = investments.reduce((sum, item) => sum + Number(item.totalInvested || 0), 0);
    const totalCurrentValue = investments.reduce((sum, item) => sum + Number(item.currentValue || item.totalInvested || 0), 0);
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

  const closeInvestmentDrawer = () => {
    setDrawerOpen(false);
    setSelectedInvestmentId(null);
    setDrawerMode('create');
  };

  const closeAssetTaxonomyDrawer = () => {
    setAssetTaxonomyDrawerOpen(false);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  const handleSaveInvestment = (formValues) => {
    const persistInvestment = async () => {
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

  const handleSaveAssetTaxonomy = (formValues) => {
    const persistAssetTaxonomy = async () => {
      try {
        if (formValues.id) {
          const updatedNode = await updateInvestmentAssetTaxonomy(formValues.id, formValues);
          setTaxonomyNodes((current) => current.map((node) => (node.id === updatedNode.id ? updatedNode : node)));
          pushNotification({ type: 'success', message: 'Asset taxonomy updated' });
          return updatedNode;
        } else {
          const createdNode = await createInvestmentAssetTaxonomy(formValues);
          setTaxonomyNodes((current) => [...current, createdNode]);
          pushNotification({ type: 'success', message: 'Asset taxonomy saved' });
          return createdNode;
        }
      } catch (error) {
        void error;
        pushNotification({ type: 'error', message: formValues.id ? 'Failed to update asset taxonomy' : 'Failed to save asset taxonomy' });
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
          <Typography variant="body2">{getInvestmentCategoryLabel(row.category, taxonomyNodes)}</Typography>
        ),
      },
      {
        field: 'nextAction',
        headerName: 'Maturity',
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: ({ row }) => (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {formatInvestmentDate(row.maturityDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.maturityDate ? 'Maturity date' : 'No maturity date'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => <StatusChip label={row.status} tone={getInvestmentStatusTone(row.status)} />,
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
        <KpiCard title="Total Invested Amount" value={formatInvestmentCurrency(dashboardKpis.totalInvested)} icon={<Icon path={mdiTrendingUp} size={1} />} />
        <KpiCard title="Current Portfolio Value" value={formatInvestmentCurrency(dashboardKpis.totalCurrentValue)} icon={<Icon path={mdiTrendingUp} size={1} />} />
        <KpiCard title="Upcoming Maturity" value={formatInvestmentCurrency(dashboardKpis.upcomingMaturity)} icon={<Icon path={mdiCalendarClockOutline} size={1} />} />
        <KpiCard title="Insurance Cover" value={formatInvestmentCurrency(dashboardKpis.insuranceCover)} icon={<Icon path={mdiShieldCheckOutline} size={1} />} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.3fr 1fr' }, gap: 2 }}>
        <SectionCard title="Current Value Snapshot" subtitle="Highest-value assets based on the latest stored values.">
          {topCurrentValueItems.length ? (
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
          ) : (
            <EmptyState text="No current value snapshot" subText="Assets with captured current values will surface here." />
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
                    {formatInvestmentCurrency(item.value)}
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
                      secondary={`${item.institution} • ${item.type} • ${formatInvestmentDate(item.maturityDate)}`}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatInvestmentCurrency(item.currentValue || item.totalInvested)}
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
            <AppButton variant="contained" onClick={openCreateDrawer}>
              <Icon path={mdiPlus} size={0.8} style={{ marginRight: 8 }} />
              Add Investment
            </AppButton>
          </Box>
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
                            color="warning"
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
          ) : (
            <EmptyState
              text="No upcoming calendar actions"
              subText="Assets with future maturity dates will appear in this agenda view."
            />
          )}
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

      <InvestmentFormDrawer
        open={drawerOpen && drawerMode !== 'view'}
        onClose={closeInvestmentDrawer}
        onSubmit={handleSaveInvestment}
        initialValues={drawerMode === 'edit' ? selectedInvestment : null}
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
    </Box>
  );
}