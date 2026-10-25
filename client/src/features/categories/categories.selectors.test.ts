import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  getCategoryDistributionChart,
  getCategoryInsights,
  getCategoryRows,
  getCategoryStatsByName,
  getFilteredCategories,
  getTableCategories,
  getTopCategoryActivity,
} from "./categories.selectors";
import type { CategoryRecord } from "./categories.types";
import type { TransactionRecord } from "../transactions/transaction.types";

const categories: CategoryRecord[] = [
  {
    id: "food",
    name: "Food",
    type: "expense",
    icon: "cart",
    color: "#123456",
    userId: "user-1",
    createdAt: "2025-01-10T12:00:00.000Z",
    updatedAt: "2025-01-10T12:00:00.000Z",
  },
  {
    id: "salary",
    name: "Salary",
    type: "income",
    userId: "user-1",
    createdAt: "2025-02-10T12:00:00.000Z",
    updatedAt: "2025-02-10T12:00:00.000Z",
  },
];

const transactions: TransactionRecord[] = [
  {
    id: "tx-1",
    type: "EXPENSE",
    amount: 30,
    category: "Food",
    date: "2025-03-01T12:00:00.000Z",
    userId: "user-1",
    createdAt: "2025-03-01T12:00:00.000Z",
    updatedAt: "2025-03-01T12:00:00.000Z",
  },
  {
    id: "tx-2",
    type: "EXPENSE",
    amount: 0,
    category: "Food",
    date: "2025-03-02T12:00:00.000Z",
    userId: "user-1",
    createdAt: "2025-03-02T12:00:00.000Z",
    updatedAt: "2025-03-02T12:00:00.000Z",
  },
  {
    id: "tx-3",
    type: "INCOME",
    amount: 100,
    categoryLabelSnapshot: "Salary",
    date: "2025-03-03T12:00:00.000Z",
    userId: "user-1",
    createdAt: "2025-03-03T12:00:00.000Z",
    updatedAt: "2025-03-03T12:00:00.000Z",
  },
];

const getId = (category: CategoryRecord) => category._id || category.id;

describe("category selectors", () => {
  it("filters by normalized search, type, and inclusive date boundaries", () => {
    expect(
      getFilteredCategories(categories, {
        dateRange: [dayjs("2025-01-10"), dayjs("2025-01-10")],
        typeFilter: "expense",
        search: " FOOD ",
      }),
    ).toEqual([categories[0]]);
    expect(
      getFilteredCategories(categories, {
        dateRange: [null, null],
        typeFilter: "income",
        search: "",
      }),
    ).toEqual([categories[1]]);
  });

  it("applies type, color, and ID drilldowns", () => {
    expect(
      getTableCategories(categories, { kind: "type", value: "income" }, getId),
    ).toEqual([categories[1]]);
    expect(getTableCategories(categories, { kind: "colored" }, getId)).toEqual([
      categories[0],
    ]);
    expect(
      getTableCategories(
        categories,
        { kind: "category", value: "salary" },
        getId,
      ),
    ).toEqual([categories[1]]);
  });

  it("aggregates positive, negative, zero, and snapshot-category transactions", () => {
    const stats = getCategoryStatsByName(categories, transactions);
    expect(stats.get("Food")).toEqual({
      count: 2,
      amount: -30,
      lastActivity: "2025-03-02T12:00:00.000Z",
    });
    expect(stats.get("Salary")?.amount).toBe(100);

    const insights = getCategoryInsights(categories, stats);
    expect(insights).toMatchObject({
      totalCategories: 2,
      incomeCount: 1,
      expenseCount: 1,
      coloredCount: 1,
      totalTransactions: 3,
      unusedCount: 0,
      mostUsedCategory: { name: "Food", count: 2, amount: -30 },
    });
  });

  it("builds a sorted distribution without zero-value segments and supports empty inputs", () => {
    const stats = getCategoryStatsByName(categories, transactions);
    const chart = getCategoryDistributionChart(categories, stats, getId, [
      "#abcdef",
    ]);
    expect(chart.totalAmount).toBe(130);
    expect(chart.segments.map(({ key }) => key)).toEqual(["salary", "food"]);
    expect(chart.segments[0].fraction + chart.segments[1].fraction).toBeCloseTo(
      1,
    );
    expect(
      getCategoryDistributionChart([], new Map(), getId, []).segments,
    ).toEqual([]);
  });

  it("produces bounded activity and table rows with numeric fallbacks", () => {
    const stats = getCategoryStatsByName(categories, transactions);
    expect(getTopCategoryActivity(categories, stats, getId)[0]).toMatchObject({
      id: "food",
      count: 2,
      amount: -30,
    });
    expect(
      getCategoryRows(categories, stats, getId, {
        income: "cash",
        expense: "cart",
      }),
    ).toMatchObject([
      {
        id: "food",
        icon: "cart",
        transactionCount: 2,
        totalAmount: -30,
      },
      { id: "salary", icon: "cash", transactionCount: 1, totalAmount: 100 },
    ]);
  });
});
