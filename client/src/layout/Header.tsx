import { useMemo, useState } from 'react';
import Icon from '@mdi/react';
import { mdiCalendarMonthOutline, mdiPlus, mdiWeatherNight, mdiWeatherSunny } from '@mdi/js';
import { Box, MenuItem, Paper, Popover, Select, Typography } from '@mui/material';
import AppButton from '../components/common/AppButton';
import type { Screen } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { useHeaderActionStore } from '../store/headerActionStore';
import { useThemeStore } from '../store/themeStore';
import {
  PAGE_MONTH_OPTIONS,
  FISCAL_MONTH_ORDER,
  getFiscalYearStart,
  usePageDateFilterStore,
} from '../store/pageDateFilterStore';

interface HeaderProps {
  activeScreen: Screen;
  config?: {
    showHeaderDateFilter?: boolean;
  };
}

const labelByScreen: Record<Screen, string> = {
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  accounts: 'Accounts',
  budgets: 'Budgets',
  goals: 'Goals',
  categories: 'Categories',
  investments: 'Investments',
  cards: 'Cards',
  reminders: 'Reminders',
  settings: 'Settings',
};

export default function Header({ activeScreen, config }: HeaderProps) {
  const headerAction = useHeaderActionStore((state) => state.actions[activeScreen]);
  const user = useAuthStore((state) => state.user);
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const [dateFilterAnchorEl, setDateFilterAnchorEl] = useState<HTMLElement | null>(null);
  const periodMode = usePageDateFilterStore((state) => state.mode);
  const selectedYear = usePageDateFilterStore((state) => state.selectedYear);
  const selectedMonth = usePageDateFilterStore((state) => state.selectedMonth);
  const setPeriodMode = usePageDateFilterStore((state) => state.setMode);
  const setSelectedYear = usePageDateFilterStore((state) => state.setSelectedYear);
  const setSelectedMonth = usePageDateFilterStore((state) => state.setSelectedMonth);

  const currentFiscalYearStart = getFiscalYearStart(new Date());
  const availableYears = Array.from({ length: 4 }, (_, index) => currentFiscalYearStart - index);
  const supportsHeaderDateFilter =
    activeScreen === 'dashboard' ||
    activeScreen === 'goals' ||
    activeScreen === 'transactions' ||
    activeScreen === 'categories';
  const showHeaderDateFilter = supportsHeaderDateFilter && (config?.showHeaderDateFilter ?? true);
  const isDateFilterOpen = Boolean(dateFilterAnchorEl);

  const dateFilterSummary = useMemo(() => {
    const fiscalYearLabel = `FY ${selectedYear}-${String(selectedYear + 1).slice(-2)}`;
    if (periodMode === 'yearly') {
      return `Yearly • ${fiscalYearLabel}`;
    }

    return `${PAGE_MONTH_OPTIONS[selectedMonth]} • ${fiscalYearLabel}`;
  }, [periodMode, selectedMonth, selectedYear]);

  const handleOpenDateFilter = (event: React.MouseEvent<HTMLElement>) => {
    setDateFilterAnchorEl(event.currentTarget);
  };

  const handleCloseDateFilter = () => {
    setDateFilterAnchorEl(null);
  };

  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.25, mb: 2, border: 0, ml: -2, mr: -2, borderRadius: 0 }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', lg: 'center' }, justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
        <Box>
          {user ? (
            <Typography variant="h6" color="text.secondary"  sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Welcome {user.name || user.email}
            </Typography>
          ) : null}
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
            You are on - {labelByScreen[activeScreen]}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap'}}>
          {showHeaderDateFilter ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <AppButton
                  size="small"
                  variant="outlined"
                  onClick={handleOpenDateFilter}
                  aria-label="Open compact page date filter"
                  sx={{
                    minWidth: 40,
                    width: 40,
                    height: 40,
                    p: 0,
                    borderColor: isDateFilterOpen ? 'primary.main' : 'divider',
                    backgroundColor: isDateFilterOpen ? 'action.hover' : 'transparent',
                  }}
                >
                  <Icon path={mdiCalendarMonthOutline} size={0.8} />
                </AppButton>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                    Active Filter
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {dateFilterSummary}
                  </Typography>
                </Box>
              </Box>

              <Popover
                open={isDateFilterOpen}
                anchorEl={dateFilterAnchorEl}
                onClose={handleCloseDateFilter}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 1,
                      width: 320,
                      maxWidth: 'calc(100vw - 24px)',
                      p: 1.5,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: '0 20px 48px rgba(15, 23, 42, 0.14)',
                    },
                  },
                }}
              >
                <Box sx={{ display: 'grid', gap: 1.25 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Page Date Filter
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      This filters the current page only.
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'inline-flex', borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <AppButton
                      size="small"
                      variant={periodMode === 'monthly' ? 'contained' : 'text'}
                      onClick={() => setPeriodMode('monthly')}
                      sx={{ borderRadius: 0, minWidth: 92, flex: 1 }}
                    >
                      Monthly
                    </AppButton>
                    <AppButton
                      size="small"
                      variant={periodMode === 'yearly' ? 'contained' : 'text'}
                      onClick={() => setPeriodMode('yearly')}
                      sx={{ borderRadius: 0, minWidth: 84, flex: 1 }}
                    >
                      Yearly
                    </AppButton>
                  </Box>

                  {periodMode === 'monthly' ? (
                    <Select
                      size="small"
                      value={selectedMonth}
                      onChange={(event) => setSelectedMonth(Number(event.target.value))}
                      fullWidth
                    >
                      {FISCAL_MONTH_ORDER.map((monthIndex) => (
                        <MenuItem key={PAGE_MONTH_OPTIONS[monthIndex]} value={monthIndex}>
                          {PAGE_MONTH_OPTIONS[monthIndex]}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : null}

                  <Select
                    size="small"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                    fullWidth
                  >
                    {availableYears.map((year) => (
                      <MenuItem key={year} value={year}>{`FY ${year}-${String(year + 1).slice(-2)}`}</MenuItem>
                    ))}
                  </Select>
                </Box>
              </Popover>
            </>
          ) : null}

          {headerAction ? (
            <AppButton variant="contained" onClick={headerAction.onClick} disabled={headerAction.disabled}>
              <Icon path={mdiPlus} size={0.8} style={{ marginRight: 8 }} />
              {headerAction.label}
            </AppButton>
          ) : null}

          <AppButton
            variant="text"
            onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme mode"
            title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            sx={{ minWidth: 40, width: 40, height: 40, p: 0 }}
          >
            <Icon path={mode === 'dark' ? mdiWeatherSunny : mdiWeatherNight} size={0.95} />
          </AppButton>
        </Box>
      </Box>
    </Paper>
  );
}
