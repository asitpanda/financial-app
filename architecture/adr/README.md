# Architecture Decision Records

ADRs capture significant architectural decisions and the reasoning behind them.

The canonical architecture documents describe **what is true today**.

ADRs describe **why a significant architectural choice was made**.

## Index

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](./ADR-001-use-investment-as-common-financial-product-aggregate.md) | Use `Investment` as the common financial-product aggregate | Accepted |
| [ADR-002](./ADR-002-separate-transactions-from-investment-events.md) | Separate cash movement from product activity | Accepted |
| [ADR-003](./ADR-003-separate-financial-activity-from-valuation.md) | Separate financial activity from observed valuation | Accepted |
| [ADR-004](./ADR-004-use-config-driven-accounting-treatment.md) | Use configuration-driven accounting treatment | Accepted |
| [ADR-005](./ADR-005-reuse-contribution-plan-for-premiums.md) | Reuse `InvestmentContributionPlan` for premiums | Accepted |
| [ADR-006](./ADR-006-introduce-investment-benefit.md) | Introduce `InvestmentBenefit` for contractual future benefits | Proposed |

## ADR template

Each ADR should include:

```text
Title
Status
Context
Decision
Options considered
Consequences
Risks
Migration / compatibility
Related architecture docs
```

Do not rewrite historical ADRs simply because a later decision supersedes them. Mark the old ADR as superseded and link to the replacement.
