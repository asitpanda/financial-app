import dayjs, { type Dayjs } from "dayjs";
import type { PageDateFilterMode } from "../../store/pageDateFilterStore";
import type {
  CategoryRecord,
  CategoryTableDrilldown,
} from "./categories.types";
import type { TransactionRecord } from "../transactions/transaction.types";

interface CategoryFilterInput {
  dateRange: [Dayjs | null, Dayjs | null];
  typeFilter: string;
  search: string;
}

interface CategoryStats {
  count: number;
  amount: number;
  lastActivity: string | null;
}

export interface CategoryInsights {
  totalCategories: number;
  incomeCount: number;
  expenseCount: number;
  coloredCount: number;
  totalTransactions: number;
  unusedCount: number;
  mostUsedCategory: {
    name: string;
    count: number;
    amount: number;
    type: string;
  } | null;
}

export interface CategoryDistributionSegment {
  key: string;
  label: string;
  count: number;
  amount: number;
  rawAmount: number;
  color: string;
  type: string;
  fraction: number;
  dash: number;
  gap: number;
  offset: number;
}

export interface CategoryDistributionChart {
  segments: CategoryDistributionSegment[];
  circumference: number;
  totalAmount: number;
}

export interface TopCategoryActivityItem {
  id: string;
  name: string;
  type: string;
  count: number;
  amount: number;
  lastActivity: string | null;
}

const getTransactionCategory = (transaction: TransactionRecord) =>
  transaction.category || "";

export const getFilteredCategoryTransactions = (
  transactions: TransactionRecord[],
  periodMode: PageDateFilterMode,
  selectedYear: number,
  selectedMonth: number,
  matchesPageDateFilter: (
    date: Date,
    mode: PageDateFilterMode,
    year: number,
    month: number,
  ) => boolean,
) => {
  return transactions.filter((transaction: TransactionRecord) => {
    const transactionDate = new Date(
      transaction.date || transaction.createdAt || Date.now(),
    );
    return matchesPageDateFilter(
      transactionDate,
      periodMode,
      selectedYear,
      selectedMonth,
    );
  });
};

export const getFilteredCategories = (
  categories: CategoryRecord[],
  { dateRange, typeFilter, search }: CategoryFilterInput,
) => {
  const [from, to] = dateRange;

  return categories.filter((category: CategoryRecord) => {
    const categoryFilterDate = category.createdAt || category.updatedAt;
    const created = categoryFilterDate ? dayjs(categoryFilterDate) : null;

    if (typeFilter !== "all" && category.type !== typeFilter) return false;

    if (from && (!created || created.isBefore(from.startOf("day")))) return false;
    if (to && (!created || created.isAfter(to.endOf("day")))) return false;

    const haystack =
      `${category.name || ""} ${category.icon || ""} ${category.type || ""}`.toLowerCase();

    if (search.trim() && !haystack.includes(search.trim().toLowerCase())) {
      return false;
    }

    return true;
  });
};

export const getTableCategories = (
  filteredCategories: CategoryRecord[],
  tableDrilldown: CategoryTableDrilldown,
  getCategoryId: (category: CategoryRecord) => string,
) => {
  if (tableDrilldown.kind === "all") return filteredCategories;

  if (tableDrilldown.kind === "type") {
    return filteredCategories.filter(
      (category: CategoryRecord) => category.type === tableDrilldown.value,
    );
  }

  if (tableDrilldown.kind === "colored") {
    return filteredCategories.filter((category: CategoryRecord) =>
      Boolean(category.color),
    );
  }

  if (tableDrilldown.kind === "category") {
    return filteredCategories.filter(
      (category: CategoryRecord) => getCategoryId(category) === tableDrilldown.value,
    );
  }

  return filteredCategories;
};

export const getCategoryStatsByName = (
  filteredCategories: CategoryRecord[],
  filteredTransactions: TransactionRecord[],
): Map<string, CategoryStats> => {
  const allowedCategories = new Map(
    filteredCategories
      .filter((category: CategoryRecord) => category?.name)
      .map((category: CategoryRecord) => [category.name, category]),
  );

  return filteredTransactions.reduce((acc, transaction: TransactionRecord) => {
    const transactionCategory = getTransactionCategory(transaction);
    const matchedCategory = allowedCategories.get(transactionCategory);
    if (!matchedCategory) return acc;

    const previous = acc.get(transactionCategory) || {
      count: 0,
      amount: 0,
      lastActivity: null,
    };

    const numericAmount = Number(transaction.amount || 0);
    const signedAmount =
      transaction.type === "expense" ? -numericAmount : numericAmount;
    const activityDate = transaction.date || transaction.createdAt || null;

    acc.set(transactionCategory, {
      count: previous.count + 1,
      amount: previous.amount + signedAmount,
      lastActivity:
        !previous.lastActivity ||
        (activityDate &&
          new Date(activityDate) > new Date(previous.lastActivity))
          ? activityDate
          : previous.lastActivity,
    });

    return acc;
  }, new Map<string, CategoryStats>());
};

export const getCategoryInsights = (
  filteredCategories: CategoryRecord[],
  categoryStatsByName: Map<string, CategoryStats>,
): CategoryInsights => {
  const incomeCount = filteredCategories.filter(
    (category: CategoryRecord) => category.type === "income",
  ).length;

  const expenseCount = filteredCategories.filter(
    (category: CategoryRecord) => category.type === "expense",
  ).length;

  const coloredCount = filteredCategories.filter((category: CategoryRecord) =>
    Boolean(category.color),
  ).length;

  let totalTransactions = 0;
  let unusedCount = 0;
  let mostUsedCategory: CategoryInsights["mostUsedCategory"] = null;

  filteredCategories.forEach((category: CategoryRecord) => {
    const categoryStats = categoryStatsByName.get(category.name) || {
      count: 0,
      amount: 0,
      lastActivity: null,
    };

    totalTransactions += categoryStats.count;
    if (!categoryStats.count) unusedCount += 1;

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
    totalCategories: filteredCategories.length,
    incomeCount,
    expenseCount,
    coloredCount,
    totalTransactions,
    unusedCount,
    mostUsedCategory,
  };
};

export const getCategoryDistributionChart = (
  filteredCategories: CategoryRecord[],
  categoryStatsByName: Map<string, CategoryStats>,
  getCategoryId: (category: CategoryRecord) => string,
  fallbackColors: string[],
): CategoryDistributionChart => {
  const segments = filteredCategories
    .map((category: CategoryRecord, index: number) => {
      const categoryStats = categoryStatsByName.get(category.name) || {
        count: 0,
        amount: 0,
        lastActivity: null,
      };

      return {
        key: getCategoryId(category),
        label: category.name || "Unnamed Category",
        count: categoryStats.count,
        amount: Math.abs(categoryStats.amount),
        rawAmount: categoryStats.amount,
        color:
          category.color || fallbackColors[index % fallbackColors.length],
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
      const fraction = totalAmount ? segment.amount / totalAmount : 0;
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
};

export const getTopCategoryActivity = (
  filteredCategories: CategoryRecord[],
  categoryStatsByName: Map<string, CategoryStats>,
  getCategoryId: (category: CategoryRecord) => string,
): TopCategoryActivityItem[] => {
  return [...filteredCategories]
    .map((category: CategoryRecord) => {
      const categoryStats = categoryStatsByName.get(category.name) || {
        count: 0,
        amount: 0,
        lastActivity: null,
      };

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
    .slice(0, 5);
};

export const getCategoryRows = (
  tableCategories: CategoryRecord[],
  categoryStatsByName: Map<string, CategoryStats>,
  getCategoryId: (category: CategoryRecord) => string,
  defaultIconByType: { income: string; expense: string },
) => {
  return tableCategories.map((category: CategoryRecord) => {
    const id = getCategoryId(category);
    const resolvedType = category.type || "expense";
    const resolvedIcon =
      category.icon ||
      defaultIconByType[resolvedType === "income" ? "income" : "expense"] ||
      "cart";

    const categoryStats = categoryStatsByName.get(category.name) || {
      count: 0,
      amount: 0,
      lastActivity: null,
    };

    return {
      id,
      category,
      name: category.name || "Unnamed Category",
      icon: resolvedIcon,
      type: resolvedType,
      color: category.color || null,
      transactionCount: categoryStats.count || 0,
      totalAmount: categoryStats.amount,
      lastActivity: categoryStats.lastActivity,
      createdAt: category.createdAt || null,
    };
  });
};
