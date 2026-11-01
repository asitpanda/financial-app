import { KpiCard } from "../../../components/common";
import type { DashboardInvestmentSummary } from "../dashboard.types";
import {
  PROFIT_LOSS_COLORS,
  getProfitLossHexColor,
} from "../../../colors";

interface DashboardKpiStripProps {
  balance: number;
  investmentSummary: Pick<
    DashboardInvestmentSummary,
    | "periodCurrentValue"
    | "periodTotalInvested"
    | "periodUnrealisedGain"
    | "periodUnrealisedGainPct"
  >;
}

import { useCurrencyFormatter } from "../../../utils/currency";

export default function DashboardKpiStrip({
  balance,
  investmentSummary,
}: DashboardKpiStripProps) {
  const formatCurrency = useCurrencyFormatter();
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Balance"
        value={
          <span style={{ color: getProfitLossHexColor(balance, "gain") }}>
            {formatCurrency(balance)}
          </span>
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
                color: getProfitLossHexColor(
                  investmentSummary.periodCurrentValue -
                    investmentSummary.periodTotalInvested,
                  "gain",
                ),
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
          <span style={{ color: PROFIT_LOSS_COLORS.lossHex }}>
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
                color: getProfitLossHexColor(
                  investmentSummary.periodUnrealisedGain,
                  "gain",
                ),
              }}
            >
              {formatCurrency(investmentSummary.periodUnrealisedGain)} (
              {investmentSummary.periodUnrealisedGainPct >= 0 ? "+" : ""}
              {investmentSummary.periodUnrealisedGainPct.toFixed(1)}%)
            </div>
          </div>
        }
      />
    </section>
  );
}
