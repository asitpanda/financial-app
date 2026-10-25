import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import type { Investment } from "../types/investment.types";
import InsurancePositionWidget from "./InsurancePositionWidget";

const insurance = (overrides: Partial<Investment> = {}): Investment => ({
  id: "policy-1",
  name: "Family Health Cover",
  type: "INSURANCE",
  category: "HEALTH",
  institution: "Acme Insurance",
  totalInvested: 12000,
  currentValue: 0,
  insuranceCover: 500000,
  status: "active",
  accountingTreatment: "PROTECTION_EXPENSE",
  startDate: "2026-01-01",
  benefits: [],
  ...overrides,
});

describe("InsurancePositionWidget", () => {
  it("filters policies and selects a policy row", async () => {
    const user = userEvent.setup();
    const onSelectPolicies = vi.fn();
    const savingsPolicy = insurance({
      id: "policy-2",
      name: "Retirement Savings",
      category: "SAVINGS",
      accountingTreatment: "INSURANCE_SAVINGS",
      totalInvested: 24000,
      insuranceCover: 200000,
    });

    renderWithProviders(
      <InsurancePositionWidget
        investments={[insurance(), savingsPolicy]}
        taxonomyNodes={[]}
        formatCurrency={(value) => `₹${value}`}
        onSelectPolicies={onSelectPolicies}
      />,
    );

    expect(screen.getByText("Family Health Cover")).toBeInTheDocument();
    expect(screen.getByText("Retirement Savings")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Savings/ }));
    expect(screen.queryByText("Family Health Cover")).not.toBeInTheDocument();
    expect(screen.getByText("Retirement Savings")).toBeInTheDocument();

    await user.click(screen.getByText("Retirement Savings"));
    expect(onSelectPolicies).toHaveBeenCalledWith(
      ["policy-2"],
      "Retirement Savings",
      expect.stringContaining("Retirement Savings"),
    );
  });

  it("exposes due-soon policies through the filter", async () => {
    const user = userEvent.setup();
    const policy = insurance({
      activeContributionPlan: {
        status: "active",
        cadenceUnit: "month",
        cadenceInterval: 1,
        amount: 1000,
        nextDueDate: "2026-10-20",
      },
    });

    renderWithProviders(
      <InsurancePositionWidget
        investments={[policy]}
        taxonomyNodes={[]}
        formatCurrency={(value) => `₹${value}`}
      />,
    );

    expect(screen.getByText("Family Health Cover")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Due Soon/ }));
    expect(screen.getByText("Family Health Cover")).toBeInTheDocument();
  });
});