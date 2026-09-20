# Domain Overview

```mermaid
flowchart LR
    U[User]

    U --> FA[FinancialAccount]
    U --> I[Investment]
    U --> G[Goal]
    U --> C[Category]

    FA --> T[Transaction]

    I --> IE[InvestmentEvent]
    I --> CP[InvestmentContributionPlan]
    I --> VS[ValuationSnapshot]
    I --> IB[InvestmentBenefit]
    I --> TAX[Product Taxonomy]

    TAX --> AT[Accounting Treatment]
    AT --> AP[Accounting Policy]

    T -. optional link .-> IE
    IB -. realized by .-> IE

    AP --> PR[Portfolio / Expense / Net Worth / Cashflow]
```

## Responsibility summary

```text
FinancialAccount          = where money is held
Transaction               = cash movement
Investment                = financial-product ownership/lifecycle
InvestmentEvent           = product financial activity
ContributionPlan          = expected recurring activity
ValuationSnapshot         = observed value
InvestmentBenefit         = contractual future entitlement
Product Taxonomy          = what the product is
AccountingTreatment       = how the product behaves financially
Goal                      = financial objective
```
