import dayjs from "dayjs";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import type { Investment } from "../types/investment.types";
import UpcomingMaturitiesBenefitsCard from "./UpcomingMaturitiesBenefitsCard";

const investment = (overrides: Partial<Investment> = {}): Investment => ({
  id: "investment-1",
  name: "Secure Future Policy",
  institutionName: "Acme Life",
  totalInvested: 1000,
  currentValue: 1000,
  status: "active",
  accountingTreatment: "INSURANCE_SAVINGS",
  ...overrides,
});

describe("UpcomingMaturitiesBenefitsCard", () => {
  it("renders upcoming totals and selects an investment", async () => {
    const user = userEvent.setup();
    const onSelectInvestment = vi.fn();
    const benefitDate = dayjs().add(2, "day").toISOString();
    const maturityDate = dayjs().add(3, "day").toISOString();
    const laterDate = dayjs().add(45, "day").toISOString();

    renderWithProviders(
      <UpcomingMaturitiesBenefitsCard
        investments={[
          investment({
            maturityDate,
            benefits: [
              {
                id: 1,
                investmentId: "investment-1",
                benefitType: "BONUS",
                amount: 250,
                benefitDate,
                status: "EXPECTED",
              },
            ],
          }),
          investment({
            id: "investment-2",
            name: "Long Term Deposit",
            maturityDate: laterDate,
            totalInvested: 2000,
            currentValue: 2100,
          }),
        ]}
        formatCurrency={(value) => `$${value}`}
        onSelectInvestment={onSelectInvestment}
      />,
    );

    expect(screen.getByText("2 Events Scheduled")).toBeInTheDocument();
    expect(screen.getByText("$1250")).toBeInTheDocument();
    expect(screen.getAllByText("$1000")).toHaveLength(2);
    expect(screen.getAllByText("$250")).toHaveLength(2);
    expect(screen.getAllByText("Secure Future Policy")).toHaveLength(2);
    expect(screen.getByText("Bonus Distribution")).toBeInTheDocument();

    await user.click(screen.getAllByText("Secure Future Policy")[0]);
    expect(onSelectInvestment).toHaveBeenCalledWith(
      "investment-1",
      "Secure Future Policy (Bonus Distribution)",
    );

    await user.click(screen.getByRole("button", { name: "31-90 Days" }));
    expect(screen.getByText("Long Term Deposit")).toBeInTheDocument();
    expect(screen.getByText("1 Event Scheduled")).toBeInTheDocument();
    expect(screen.getAllByText("$2100")).toHaveLength(3);
  });

  it("renders the empty state for a horizon without upcoming items", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <UpcomingMaturitiesBenefitsCard
        investments={[investment({ maturityDate: dayjs().add(10, "day").toISOString() })]}
        formatCurrency={(value) => `$${value}`}
      />,
    );

    await user.click(screen.getByRole("button", { name: "91-180 Days" }));

    expect(screen.getByText("No items in 180 Days window")).toBeInTheDocument();
    expect(screen.getByText("No maturities or benefits due in the 91–180 day horizon.")).toBeInTheDocument();
  });
});