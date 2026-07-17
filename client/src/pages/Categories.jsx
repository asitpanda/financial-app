import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@mdi/react";
import {
  mdiArrowDownCircleOutline,
  mdiArrowUpCircleOutline,
  mdiDeleteOutline,
  mdiPaletteOutline,
  mdiPencilOutline,
  mdiShapeOutline,
} from "@mdi/js";
import {
  Alert,
  Box,
  IconButton,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useHeaderAction } from "../hooks/useHeaderAction";
import { useViewportTableHeight } from "../hooks/useViewportTableHeight";
import { getCategories } from "../api/categories";
import { getTransactions } from "../api/transactions";
import CategoryFormDrawer from "../components/CategoryFormDrawer";
import {
  DataTable,
  EmptyState,
  FilterBar,
  KpiCard,
  SearchBar,
  SectionCard,
  StatusChip,
} from "../components/common";
import {
  getIconPathByKey,
} from "../constants/categoryIcons";
import { ConfirmDialog } from "../components/dialogs";
import { useDrawerStore } from "../store/drawerStore";
import { useDialogStore } from "../store/dialogStore";
import { useNotificationStore } from "../store/notificationStore";
import { matchesPageDateFilter, usePageDateFilterStore } from "../store/pageDateFilterStore";
import { closeDialog, closeDrawer, openDialog, openDrawer } from "../services/navigation";
import { executeActionContract } from "../utils/actionContract";
import { buildDeleteCategoryAction, buildSaveCategoryAction } from "../modules/categories/actions";

const getCategoryId = (category) => category._id || category.id;

const getInitialDateFilter = () => ({ dateRange: [null, null], dateRangeShortcut: "all" });
const DEFAULT_ICON_BY_TYPE = { income: "cash", expense: "cart" };
const CATEGORY_FALLBACK_COLORS = [
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

const formatCurrency = (value) => {
  const numericValue = Number(value || 0);
  const prefix = numericValue > 0 ? "+" : numericValue < 0 ? "-" : "";
  return `${prefix}₹${Math.abs(numericValue).toLocaleString()}`;
};

export default function Categories() {
  const categoryTableRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const drawerOpen = useDrawerStore((state) => state.open);
  const drawerType = useDrawerStore((state) => state.type);
  const drawerMode = useDrawerStore((state) => state.mode);
  const drawerEntityId = useDrawerStore((state) => state.entityId);

  const dialogOpen = useDialogStore((state) => state.open);
  const dialogType = useDialogStore((state) => state.type);
  const dialogPayload = useDialogStore((state) => state.payload);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tableDrilldown, setTableDrilldown] = useState({ kind: "all" });
  const [dateRange, setDateRange] = useState([null, null]);
  const [dateRangeShortcut, setDateRangeShortcut] = useState("all");

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const periodMode = usePageDateFilterStore((state) => state.mode);
  const selectedYear = usePageDateFilterStore((state) => state.selectedYear);
  const selectedMonth = usePageDateFilterStore((state) => state.selectedMonth);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [categoryResult, transactionResult] = await Promise.all([
        getCategories(),
        getTransactions(),
      ]);
      setCategories(Array.isArray(categoryResult) ? categoryResult : []);
      setTransactions(Array.isArray(transactionResult) ? transactionResult : []);
      setError("");
    } catch (e) {
      void e;
      setError("Failed to load categories");
      pushNotification({ type: "error", message: "Failed to load categories" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [pushNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddDrawer = () => {
    openDrawer({ type: "category", mode: "create", step: "form" });
  };

  useHeaderAction("categories", {
    label: "Category",
    onClick: openAddDrawer,
    disabled: loading,
  });

  const openEditDrawer = useCallback((category) => {
    openDrawer({
      type: "category",
      mode: "edit",
      entityId: getCategoryId(category),
      step: "form",
    });
  }, []);

  const selectedCategory = useMemo(() => {
    if (!drawerEntityId || drawerType !== "category") return null;
    return categories.find((category) => getCategoryId(category) === drawerEntityId) || null;
  }, [categories, drawerEntityId, drawerType]);

  const isCategoryFormDrawerOpen =
    drawerOpen &&
    drawerType === "category" &&
    (drawerMode === "create" || drawerMode === "edit");

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setTypeFilter("all");
    setTableDrilldown({ kind: "all" });
    const initialDateFilter = getInitialDateFilter();
    setDateRange(initialDateFilter.dateRange);
    setDateRangeShortcut(initialDateFilter.dateRangeShortcut);
  }, []);

  const applyDateRangeShortcut = (shortcut) => {
    setDateRangeShortcut(shortcut);

    if (shortcut === "all") {
      setDateRange([null, null]);
      return;
    }

    if (shortcut === "custom") return;

    const now = dayjs();
    if (shortcut === "last7") {
      setDateRange([now.subtract(6, "day"), now]);
      return;
    }
    if (shortcut === "last30") {
      setDateRange([now.subtract(29, "day"), now]);
      return;
    }
    if (shortcut === "thisMonth") {
      setDateRange([now.startOf("month"), now.endOf("month")]);
      return;
    }
    if (shortcut === "thisYear") {
      setDateRange([now.startOf("year"), now.endOf("year")]);
    }
  };

  const focusCategoryTable = useCallback(() => {
    requestAnimationFrame(() => {
      categoryTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleTableDrilldown = useCallback((nextDrilldown = { kind: "all" }) => {
    setTableDrilldown(nextDrilldown);
    focusCategoryTable();
  }, [focusCategoryTable]);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date || transaction.createdAt || Date.now());
        return matchesPageDateFilter(transactionDate, periodMode, selectedYear, selectedMonth);
      }),
    [transactions, periodMode, selectedYear, selectedMonth]
  );

  const filteredCategories = useMemo(() => {
    const [from, to] = dateRange;

    return categories.filter((category) => {
      const categoryFilterDate = category.createdAt || category.updatedAt;
      const created = categoryFilterDate ? dayjs(categoryFilterDate) : null;

      if (typeFilter !== "all" && category.type !== typeFilter) return false;

      if (from) {
        if (!created || created.isBefore(from.startOf("day"))) return false;
      }
      if (to) {
        if (!created || created.isAfter(to.endOf("day"))) return false;
      }

      const haystack = `${category.name || ""} ${category.icon || ""} ${category.type || ""}`.toLowerCase();
      if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;

      return true;
    });
  }, [categories, dateRange, search, typeFilter]);

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [search, typeFilter, tableDrilldown, dateRange]);

  const tableCategories = useMemo(() => {
    if (tableDrilldown.kind === "all") {
      return filteredCategories;
    }

    if (tableDrilldown.kind === "type") {
      return filteredCategories.filter((category) => category.type === tableDrilldown.value);
    }

    if (tableDrilldown.kind === "colored") {
      return filteredCategories.filter((category) => Boolean(category.color));
    }

    if (tableDrilldown.kind === "category") {
      return filteredCategories.filter((category) => getCategoryId(category) === tableDrilldown.value);
    }

    return filteredCategories;
  }, [filteredCategories, tableDrilldown]);

  const categoryStatsByName = useMemo(() => {
    const allowedCategories = new Map(
      filteredCategories
        .filter((category) => category?.name)
        .map((category) => [category.name, category])
    );

    return filteredTransactions.reduce((acc, transaction) => {
      const matchedCategory = allowedCategories.get(transaction.category);
      if (!matchedCategory) return acc;

      const previous = acc.get(transaction.category) || {
        count: 0,
        amount: 0,
        lastActivity: null,
      };
      const numericAmount = Number(transaction.amount || 0);
      const signedAmount = transaction.type === "expense" ? -numericAmount : numericAmount;
      const activityDate = transaction.date || transaction.createdAt || null;

      acc.set(transaction.category, {
        count: previous.count + 1,
        amount: previous.amount + signedAmount,
        lastActivity:
          !previous.lastActivity || (activityDate && new Date(activityDate) > new Date(previous.lastActivity))
            ? activityDate
            : previous.lastActivity,
      });

      return acc;
    }, new Map());
  }, [filteredCategories, filteredTransactions]);

  const categoryInsights = useMemo(() => {
    const source = filteredCategories;
    const incomeCount = source.filter((category) => category.type === "income").length;
    const expenseCount = source.filter((category) => category.type === "expense").length;
    const coloredCount = source.filter((category) => Boolean(category.color)).length;

    let totalTransactions = 0;
    let unusedCount = 0;
    let mostUsedCategory = null;

    source.forEach((category) => {
      const categoryStats = categoryStatsByName.get(category.name) || { count: 0, amount: 0, lastActivity: null };
      totalTransactions += categoryStats.count;
      if (!categoryStats.count) {
        unusedCount += 1;
      }

      if (!mostUsedCategory || categoryStats.count > mostUsedCategory.count) {
        mostUsedCategory = {
          name: category.name || "Unnamed Category",
          count: categoryStats.count,
          amount: categoryStats.amount,
          type: category.type || "expense",
        };
      }
    });

    return {
      totalCategories: source.length,
      incomeCount,
      expenseCount,
      coloredCount,
      totalTransactions,
      unusedCount,
      mostUsedCategory,
    };
  }, [categoryStatsByName, filteredCategories]);

  const categoryDistributionChart = useMemo(() => {
    const segments = filteredCategories
      .map((category, index) => {
        const categoryStats = categoryStatsByName.get(category.name) || { count: 0, amount: 0, lastActivity: null };
        return {
          key: getCategoryId(category),
          label: category.name || "Unnamed Category",
          count: categoryStats.count,
          amount: Math.abs(categoryStats.amount),
          rawAmount: categoryStats.amount,
          color: category.color || CATEGORY_FALLBACK_COLORS[index % CATEGORY_FALLBACK_COLORS.length],
          type: category.type || "expense",
        };
      })
      .filter((segment) => segment.amount > 0)
      .sort((left, right) => right.amount - left.amount);

    const totalAmount = segments.reduce((sum, segment) => sum + segment.amount, 0);

    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return {
      segments: segments.map((segment) => {
        const fraction = totalAmount
          ? segment.amount / totalAmount
          : 0;
        const dash = fraction * circumference;
        const result = {
          ...segment,
          fraction,
          dash,
          gap: circumference - dash,
          offset,
        };

        offset += dash;
        return result;
      }),
      circumference,
      totalAmount,
    };
  }, [categoryStatsByName, filteredCategories]);

  const topCategoryActivity = useMemo(
    () =>
      [...filteredCategories]
        .map((category) => {
          const categoryStats = categoryStatsByName.get(category.name) || { count: 0, amount: 0, lastActivity: null };
          return {
            id: getCategoryId(category),
            name: category.name || "Unnamed Category",
            type: category.type || "expense",
            count: categoryStats.count,
            amount: categoryStats.amount,
            lastActivity: categoryStats.lastActivity,
          };
        })
        .sort((left, right) => {
          if (right.count !== left.count) return right.count - left.count;
          return Math.abs(right.amount) - Math.abs(left.amount);
        })
        .slice(0, 5),
    [categoryStatsByName, filteredCategories]
  );

  const rows = useMemo(
    () =>
      tableCategories.map((category) => {
        const id = getCategoryId(category);
        const resolvedType = category.type || "expense";
        const resolvedIcon = category.icon || DEFAULT_ICON_BY_TYPE[resolvedType] || "cart";
        const categoryStats = categoryStatsByName.get(category.name) || { count: 0, amount: 0, lastActivity: null };

        return {
          id,
          category,
          name: category.name || "Unnamed Category",
          type: resolvedType,
          icon: resolvedIcon,
          color: category.color || "",
          transactionCount: categoryStats.count,
          totalAmount: categoryStats.amount,
          lastActivity: categoryStats.lastActivity ? new Date(categoryStats.lastActivity) : null,
          createdAt: category.createdAt ? new Date(category.createdAt) : null,
        };
      }),
    [categoryStatsByName, tableCategories]
  );
  const tableHeight = useViewportTableHeight(categoryTableRef, {
    bottomOffset: 50,
    minHeight: 360,
    defaultHeight: 620,
    deps: [loading, error, rows.length],
  });

  const handleSubmitCategory = async (payload) => {
    const action = buildSaveCategoryAction({
      payload,
      selectedCategory,
      getCategoryId,
      onSuccess: async () => {
        closeDrawer();
        setError("");
        await loadData(true);
      },
    });

    const ok = await executeActionContract(action, { notify: pushNotification });
    if (!ok && action.feedback?.error) {
      setError(action.feedback.error);
    }
  };

  const handleDelete = useCallback(async () => {
    const payload = dialogPayload && typeof dialogPayload === "object" ? dialogPayload : null;
    const targetId = payload && payload.id ? payload.id : null;
    const action = buildDeleteCategoryAction({
      targetId,
      onSuccess: async () => {
        closeDialog();
        setError("");
        await loadData(true);
      },
    });

    const ok = await executeActionContract(action, { notify: pushNotification });
    if (!ok && action.feedback?.error) {
      setError(action.feedback.error);
    }
  }, [dialogPayload, loadData, pushNotification]);

  const isCategoryDeleteDialogOpen =
    dialogOpen &&
    dialogType === "confirmDelete" &&
    dialogPayload &&
    typeof dialogPayload === "object" &&
    dialogPayload.entity === "category";

  const columns = useMemo(
    () => [
      {
        field: "name",
        headerName: "Category",
        flex: 1.35,
        minWidth: 220,
        renderCell: (params) => {
          const iconPath = getIconPathByKey(params.row.icon);
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, height: "100%" }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: params.row.color || "rgba(15, 23, 42, 0.08)",
                  color: params.row.color ? "#ffffff" : "text.primary",
                  flexShrink: 0,
                }}
              >
                {iconPath ? <Icon path={iconPath} size={0.8} color="currentColor" /> : null}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {params.value}
                </Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        field: "type",
        headerName: "Type",
        flex: 0.8,
        minWidth: 120,
        renderCell: (params) => (
          <StatusChip
            label={params.value}
            tone={params.value === "income" ? "success" : "error"}
          />
        ),
      },
      {
        field: "transactionCount",
        headerName: "Transactions",
        type: "number",
        flex: 0.9,
        minWidth: 120,
      },
      {
        field: "totalAmount",
        headerName: "Net Amount",
        flex: 1,
        minWidth: 140,
        renderCell: (params) => {
          const numericValue = Number(params.value || 0);
          const tone = numericValue > 0 ? "success.main" : numericValue < 0 ? "error.main" : "text.secondary";

          return (
            <Typography variant="body2" sx={{ fontWeight: 700, color: tone }}>
              {formatCurrency(numericValue)}
            </Typography>
          );
        },
      },
      {
        field: "lastActivity",
        headerName: "Last Activity",
        flex: 1,
        minWidth: 150,
        valueFormatter: (value) => (value ? new Date(value).toLocaleDateString() : "No activity"),
      },
      {
        field: "createdAt",
        headerName: "Created",
        flex: 0.9,
        minWidth: 140,
        valueFormatter: (value) => (value ? new Date(value).toLocaleDateString() : "-"),
      },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        flex: 0.8,
        minWidth: 160,
        renderCell: (params) => {
          const categoryName = params.row.name || "category";

          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
              <IconButton
                size="small"
                variant="contained"
                disableElevation
                title={`Edit ${categoryName}`}
                aria-label={`Edit ${categoryName}`}
                onClick={() => openEditDrawer(params.row.category)}
                sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
              >
                <Icon path={mdiPencilOutline} size={0.8} />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                variant="contained"
                disableElevation
                title={`Delete ${categoryName}`}
                aria-label={`Delete ${categoryName}`}
                onClick={() =>
                  openDialog("confirmDelete", {
                    entity: "category",
                    id: params.row.id,
                    name: params.row.name,
                  })
                }
                sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
              >
                <Icon path={mdiDeleteOutline} size={0.8} />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    [openEditDrawer]
  );

  return (
    <main className="flex-1 w-full">
      <div className="w-full">
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        {!loading && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <KpiCard
              title="Total Categories"
              value={categoryInsights.totalCategories}
              delta={`${categoryInsights.unusedCount} without activity`}
              deltaTone="neutral"
              icon={<Icon path={mdiShapeOutline} size={0.9} />}
              onClick={() => handleTableDrilldown({ kind: "all" })}
            />
            <KpiCard
              title="Income Categories"
              value={categoryInsights.incomeCount}
              delta={`${categoryInsights.totalTransactions} matched transactions`}
              deltaTone="positive"
              icon={<Icon path={mdiArrowUpCircleOutline} size={0.9} />}
              onClick={() => handleTableDrilldown({ kind: "type", value: "income" })}
            />
            <KpiCard
              title="Expense Categories"
              value={categoryInsights.expenseCount}
              delta={categoryInsights.mostUsedCategory ? `${categoryInsights.mostUsedCategory.name} leads usage` : "No activity yet"}
              deltaTone={categoryInsights.expenseCount > 0 ? "negative" : "neutral"}
              icon={<Icon path={mdiArrowDownCircleOutline} size={0.9} />}
              onClick={() => handleTableDrilldown({ kind: "type", value: "expense" })}
            />
            <KpiCard
              title="Custom Colors"
              value={categoryInsights.coloredCount}
              delta={`${Math.max(categoryInsights.totalCategories - categoryInsights.coloredCount, 0)} using defaults`}
              deltaTone="neutral"
              icon={<Icon path={mdiPaletteOutline} size={0.9} />}
              onClick={() => handleTableDrilldown({ kind: "colored" })}
            />
          </Box>
        )}

        {!loading && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", xl: "1.2fr 1fr" },
              gap: 1.5,
              mb: 2,
            }}
          >
            <SectionCard title="Category Distribution">
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "minmax(0, 60%) minmax(0, 40%)" },
                  gap: 3,
                  alignItems: "center",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Box
                    component="svg"
                    viewBox="0 0 160 160"
                    sx={{ width: { xs: 224, md: 260 }, height: { xs: 224, md: 260 } }}
                    aria-label="Category distribution donut chart"
                  >
                    <circle cx="80" cy="80" r="54" fill="none" stroke="#e5e7eb" strokeWidth="18" />
                    {categoryDistributionChart.segments.map((segment) =>
                      segment.dash > 0 ? (
                        <circle
                          key={segment.key}
                          cx="80"
                          cy="80"
                          r="54"
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="18"
                          strokeLinecap="butt"
                          strokeDasharray={`${segment.dash} ${segment.gap}`}
                          strokeDashoffset={-segment.offset}
                          transform="rotate(-90 80 80)"
                          onClick={() => handleTableDrilldown({ kind: "category", value: segment.key })}
                          style={{ cursor: "pointer" }}
                        >
                          <title>{`${segment.label}: ${segment.count} (${(segment.fraction * 100).toFixed(0)}%)`}</title>
                        </circle>
                      ) : null
                    )}
                    <circle cx="80" cy="80" r="33" fill="#ffffff" />
                    <text x="80" y="74" textAnchor="middle" fill="#6b7280" fontSize="10">
                      Active
                    </text>
                    <text x="80" y="92" textAnchor="middle" fill="#111827" fontSize="18" fontWeight="700">
                      {categoryDistributionChart.segments.length}
                    </text>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gap: 1.25,
                    maxHeight: "calc(7 * 44px)",
                    overflowY: "auto",
                    pr: 0.5,
                  }}
                >
                  {categoryDistributionChart.segments.map((segment) => (
                    <Box
                      key={segment.key}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 1,
                        cursor: "pointer",
                      }}
                      onClick={() => handleTableDrilldown({ kind: "category", value: segment.key })}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                          <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: segment.color,
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          {segment.label}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          {segment.count} txns
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "inline-flex", alignItems: "center", lineHeight: 1 }}
                        >
                          •
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: segment.rawAmount >= 0 ? "success.main" : "error.main",
                          }}
                        >
                          {formatCurrency(segment.rawAmount)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "inline-flex", alignItems: "center", lineHeight: 1 }}
                        >
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(segment.fraction * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </SectionCard>

            <SectionCard title="Top Category Activity">
              {topCategoryActivity.length === 0 ? (
                <EmptyState title="No category activity" description="Transactions mapped to categories will appear here." />
              ) : (
                <Box sx={{ display: "grid", gap: 1.25 }}>
                  {topCategoryActivity.map((category) => (
                    <Box
                      key={category.id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 1,
                        cursor: "pointer",
                      }}
                      onClick={() => handleTableDrilldown({ kind: "category", value: category.id })}
                    >
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{category.name}</Typography>
                          <StatusChip label={category.type} tone={category.type === "income" ? "success" : "error"} />
                        </Box>
                        <Box sx={{ color: "text.secondary", fontSize: 12 }}>
                          {category.count} transactions
                          {category.lastActivity ? ` • Last used ${new Date(category.lastActivity).toLocaleDateString()}` : " • No recent activity"}
                        </Box>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: category.amount >= 0 ? "success.main" : "error.main",
                        }}
                      >
                        {formatCurrency(category.amount)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </SectionCard>
          </Box>
        )}

        <Box ref={categoryTableRef}>
          <SectionCard title="Category Details Table">
            {!loading && (
              <FilterBar onReset={handleResetFilters}>
                <SearchBar value={search} onChange={setSearch} placeholder="Search categories" />

                <Select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setTableDrilldown({ kind: "all" });
                  }}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="income">Income</MenuItem>
                  <MenuItem value="expense">Expense</MenuItem>
                </Select>

                <Select value={dateRangeShortcut} onChange={(e) => applyDateRangeShortcut(e.target.value)} size="small" fullWidth>
                  <MenuItem value="all">Date Range: All Time</MenuItem>
                  <MenuItem value="last7">Date Range: Last 7 Days</MenuItem>
                  <MenuItem value="last30">Date Range: Last 30 Days</MenuItem>
                  <MenuItem value="thisMonth">Date Range: This Month</MenuItem>
                  <MenuItem value="thisYear">Date Range: This Year</MenuItem>
                  <MenuItem value="custom">Date Range: Custom</MenuItem>
                </Select>

                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="From"
                    value={dateRange[0]}
                    onChange={(value) => {
                      setDateRange([value, dateRange[1]]);
                      setDateRangeShortcut("custom");
                    }}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                  />
                </LocalizationProvider>

                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="To"
                    value={dateRange[1]}
                    onChange={(value) => {
                      setDateRange([dateRange[0], value]);
                      setDateRangeShortcut("custom");
                    }}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                  />
                </LocalizationProvider>
              </FilterBar>
            )}

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : rows.length === 0 ? (
              <EmptyState
                title="No categories found"
                description="Adjust your filters or create a category to begin organizing transactions."
                actionLabel="Add Category"
                onAction={openAddDrawer}
              />
            ) : (
              <DataTable
                rows={rows}
                columns={columns}
                pagination
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                rowBufferPx={400}
                columnBufferPx={300}
                containerSx={{ height: tableHeight }}
                initialState={{
                  sorting: { sortModel: [{ field: "transactionCount", sort: "desc" }] },
                }}
              />
            )}
          </SectionCard>
        </Box>

        <CategoryFormDrawer
          open={isCategoryFormDrawerOpen}
          onClose={closeDrawer}
          onSubmit={handleSubmitCategory}
          initialValues={selectedCategory}
          title={selectedCategory ? "Edit Category" : "Add Category"}
          submitLabel={selectedCategory ? "Update" : "Add"}
        />

        <ConfirmDialog
          open={Boolean(isCategoryDeleteDialogOpen)}
          title="Delete Category"
          description="Are you sure you want to delete this category? This action cannot be undone."
          confirmLabel="Delete"
          confirmColor="error"
          onCancel={closeDialog}
          onConfirm={handleDelete}
        />
      </div>
    </main>
  );
}
