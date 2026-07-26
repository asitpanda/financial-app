import { Box, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";
import AppButton from "../../../components/common/AppButton";
import {
  DataTable,
  FilterBar,
  KpiCard,
  SearchBar,
  SectionCard,
} from "../../../components/common";
import Icon from "@mdi/react";
import {
  mdiBankOutline,
  mdiCalendarClockOutline,
  mdiCheckCircleOutline,
  mdiShieldCheckOutline,
} from "@mdi/js";
import type { Investment } from "../types/investment.types";

interface InvestmentsAssetsViewProps {
  filteredInvestments: Investment[];
  columns: unknown[];
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categoryOptions: Array<{ value: string; label: string }>;
  onResetFilters: () => void;
  onOpenAssetTaxonomyDrawer: () => void;
  onCreateInvestment: () => void;
  isFirstInvestmentSetup: boolean;
}

export default function InvestmentsAssetsView({
  filteredInvestments,
  columns,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categoryOptions,
  onResetFilters,
  onOpenAssetTaxonomyDrawer,
  onCreateInvestment,
  isFirstInvestmentSetup,
}: InvestmentsAssetsViewProps) {
  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        <KpiCard
          title="Tracked Assets"
          value={filteredInvestments.length}
          icon={<Icon path={mdiBankOutline} size={1} />}
        />
        <KpiCard
          title="Active Assets"
          value={
            filteredInvestments.filter((item) => item.status === "active")
              .length
          }
          icon={<Icon path={mdiCheckCircleOutline} size={1} />}
        />
        <KpiCard
          title="Maturity Tracked"
          value={filteredInvestments.filter((item) => item.maturityDate).length}
          icon={<Icon path={mdiCalendarClockOutline} size={1} />}
        />
        <KpiCard
          title="Insured Assets"
          value={
            filteredInvestments.filter(
              (item) => Number(item.insuranceCover || 0) > 0,
            ).length
          }
          icon={<Icon path={mdiShieldCheckOutline} size={1} />}
        />
      </Box>

      <FilterBar onReset={onResetFilters}>
        <SearchBar
          value={search}
          onChange={onSearchChange}
          placeholder="Search by name, type, institution, or reference"
        />
        <Select
          size="small"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          fullWidth
        >
          <MenuItem value="all">All Status</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="matured">Matured</MenuItem>
          <MenuItem value="closed">Closed</MenuItem>
        </Select>
        <Select
          size="small"
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value)}
          fullWidth
        >
          {categoryOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FilterBar>

      <SectionCard
        title="Investment Assets"
        subtitle="Primary CRUD workspace for all holdings, contribution schedules, maturity dates, and attached notes."
        action={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <AppButton variant="outlined" onClick={onOpenAssetTaxonomyDrawer}>
              Manage Assets
            </AppButton>
          </Box>
        }
        empty={filteredInvestments.length === 0}
        emptyState={
          isFirstInvestmentSetup
            ? {
                title: "No investments added yet",
                description:
                  "Add your first investment to start tracking value, maturity, and recurring contributions.",
                actionLabel: "Add Investment",
                onAction: onCreateInvestment,
              }
            : {
                title: "No investments match current filters",
                description:
                  "Try broadening filters or add a new investment to expand your portfolio list.",
                actionLabel: "Add Investment",
                onAction: onCreateInvestment,
              }
        }
      >
        <DataTable
          rows={filteredInvestments}
          columns={columns}
          autoHeight={false}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          sx={{ "& .MuiDataGrid-row": { minHeight: 64 } }}
          getRowHeight={() => "auto"}
        />
      </SectionCard>
    </Stack>
  );
}
