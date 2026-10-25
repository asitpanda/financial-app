import { SectionCard } from "../../../components/common";
import type { DashboardAccountOverviewRow } from "../dashboard.types";
import { getProfitLossHexColor } from "../../../colors";
import { useTheme } from "@mui/material/styles";

interface DashboardAccountsSectionProps {
  accountOverviewRows: DashboardAccountOverviewRow[];
  onAddAccount: () => void;
  onEditAccount: (accountName: string) => void;
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function DashboardAccountsSection({
  accountOverviewRows,
  onAddAccount,
  onEditAccount,
}: DashboardAccountsSectionProps) {
  const theme = useTheme();

  return (
    <SectionCard
      title="Account Overview"
      action={
        <button
          type="button"
          onClick={onAddAccount}
          className="text-sm font-semibold transition"
          style={{ color: theme.palette.primary.main }}
        >
          Add Account
        </button>
      }
      className="h-full shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
      empty={accountOverviewRows.length === 0}
      emptyState={{
        title: "No account activity yet",
        description:
          "Add a financial account and record transactions to populate balance and period movement.",
        actionLabel: "Add Account",
        onAction: onAddAccount,
      }}
    >
      <div className="space-y-2">
        <div className="max-h-[324px] space-y-3 overflow-y-auto pr-1">
          {accountOverviewRows.map((bank) => {
            const isPositive = bank.balance >= 0;

            return (
              <button
                type="button"
                onClick={() => onEditAccount(bank.name)}
                key={bank.name}
                className="flex w-full items-center justify-between gap-4 rounded-lg border px-4 py-4 text-left"
                style={{
                  borderColor: theme.palette.divider,
                  backgroundColor: theme.palette.action.hover,
                }}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold" style={{ color: theme.palette.text.primary }}>
                    {bank.name}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className="text-sm font-semibold"
                    style={{
                      color: getProfitLossHexColor(bank.balance, "gain"),
                    }}
                  >
                    {isPositive ? "+" : "-"}
                    {formatCurrency(Math.abs(bank.balance))}
                  </div>
                </div>
              </button>
            );
          })}

          {accountOverviewRows.length === 0 ? (
            <div
              className="rounded-lg px-4 py-10 text-center text-sm font-medium"
              style={{ backgroundColor: theme.palette.action.hover, color: theme.palette.text.secondary }}
            >
              No account activity yet
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
