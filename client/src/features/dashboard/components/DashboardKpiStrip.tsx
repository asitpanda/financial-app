import React from "react";
import { KpiCard } from "../../../components/common";
import type { DashboardInvestmentSummary } from "../dashboard.types";

interface DashboardKpiStripProps {
  balance: number;
  income: number;
  expense: number;
  investmentSummary: Pick<
    DashboardInvestmentSummary,
    | "periodCurrentValue"
    | "periodTotalInvested"
    | "periodUnrealisedGain"
    | "periodUnrealisedGainPct"
  >;
  activeGoalsCount: number;
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function DashboardKpiStrip({
  balance,
  income,
  expense,
  investmentSummary,
  activeGoalsCount,
}: DashboardKpiStripProps) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
      <KpiCard title="Balance" value={formatCurrency(balance)} />
      <KpiCard
        title="Income"
        value={
          <span style={{ color: "#16a34a" }}>{formatCurrency(income)}</span>
        }
      />
      <KpiCard
        title="Expenses"
        value={
          <span style={{ color: "#dc2626" }}>{formatCurrency(expense)}</span>
        }
      />
      <KpiCard
        title="Portfolio Value"
        value={
          <div className="space-y-1">
            <div
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color:
                  investmentSummary.periodCurrentValue >=
                  investmentSummary.periodTotalInvested
                    ? "#16a34a"
                    : "#dc2626",
              }}
            >
              {formatCurrency(investmentSummary.periodCurrentValue)}
            </div>
          </div>
        }
      />
      <KpiCard
        title="Investment"
        value={
          <span style={{ color: "#dc2626" }}>
            {formatCurrency(investmentSummary.periodTotalInvested)}
          </span>
        }
      />
      <KpiCard
        title="Investment Return"
        value={
          <div className="space-y-1">
            <div
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color:
                  investmentSummary.periodUnrealisedGainPct >= 0
                    ? "#16a34a"
                    : "#dc2626",
              }}
            >
              {formatCurrency(investmentSummary.periodUnrealisedGain)} (
              {investmentSummary.periodUnrealisedGainPct >= 0 ? "+" : ""}
              {investmentSummary.periodUnrealisedGainPct.toFixed(1)}%)
            </div>
          </div>
        }
      />
      <KpiCard
        title="Goals"
        value={
          <span style={{ color: "#2563eb" }}>{activeGoalsCount} Active</span>
        }
      />
    </section>
  );
}
