import React from "react";
import { SectionCard } from "../../../components/common";
import type { DashboardAccountOverviewRow } from "../dashboard.types";

interface DashboardAccountsSectionProps {
  accountOverviewRows: DashboardAccountOverviewRow[];
  lifetimeBalance: number;
  periodBalance: number;
  selectedPeriodLabel: string;
  onAddAccount: () => void;
  onEditAccount: (accountName: string) => void;
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function DashboardAccountsSection({
  accountOverviewRows,
  lifetimeBalance,
  periodBalance,
  selectedPeriodLabel,
  onAddAccount,
  onEditAccount,
}: DashboardAccountsSectionProps) {
  return (
    <SectionCard
      title="Account Overview"
      action={
        <button
          type="button"
          onClick={onAddAccount}
          className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
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
        <div className="grid gap-3">
          <div className="rounded-[24px] border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-500">
                Balance till today
              </p>
              <div className="text-right text-[30px] font-semibold tracking-tight text-slate-900">
                {formatCurrency(lifetimeBalance)}
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-slate-100 bg-gradient-to-br from-white via-white to-emerald-50/40">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Period change
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {selectedPeriodLabel}
                </p>
              </div>
              <div
                className={`text-right text-[30px] font-semibold tracking-tight ${periodBalance >= 0 ? "text-emerald-600" : "text-rose-500"}`}
              >
                {periodBalance >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(periodBalance))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[324px] space-y-3 overflow-y-auto pr-1">
          {accountOverviewRows.map((bank) => {
            const isPositive = bank.currentBalance >= 0;
            const hasPeriodActivity = bank.periodTransactions > 0;
            const isPeriodPositive = bank.periodChange >= 0;

            return (
              <button
                type="button"
                onClick={() => onEditAccount(bank.name)}
                key={bank.name}
                className="flex w-full items-center justify-between gap-4 rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-left"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {bank.name}
                  </div>
                  <div
                    className={`mt-1 text-xs font-medium ${hasPeriodActivity ? (isPeriodPositive ? "text-emerald-600" : "text-rose-500") : "text-slate-400"}`}
                  >
                    {hasPeriodActivity
                      ? `${isPeriodPositive ? "+" : "-"}${formatCurrency(Math.abs(bank.periodChange))} in ${selectedPeriodLabel}`
                      : `No change in ${selectedPeriodLabel}`}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-semibold ${isPositive ? "text-emerald-600" : "text-rose-500"}`}
                  >
                    {isPositive ? "+" : "-"}
                    {formatCurrency(Math.abs(bank.currentBalance))}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Till today</div>
                </div>
              </button>
            );
          })}

          {accountOverviewRows.length === 0 ? (
            <div className="rounded-[24px] bg-slate-50 px-4 py-10 text-center text-sm font-medium text-slate-500">
              No account activity yet
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
