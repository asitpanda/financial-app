# ADR-005: Reuse `InvestmentContributionPlan` for Premiums

**Status:** Accepted

## Context

Investment contributions and insurance premiums share the same scheduling concerns:

- amount;
- cadence;
- start/anchor date;
- next due date;
- end date;
- reminders;
- status;
- event generation.

Creating a separate premium scheduler would duplicate infrastructure and lifecycle logic.

## Decision

Reuse `InvestmentContributionPlan` for:

- investment contributions;
- insurance premiums.

The generated event type determines whether the scheduled activity is:

```text
CONTRIBUTION
or
PREMIUM
```

## Product lifecycle vs plan lifecycle

The financial product may remain active after recurring payments end.

Example:

```text
Policy starts:         2016
Premium payments end:  2032
Policy matures:        2041
```

From 2032 to 2041:

```text
Investment.status = ACTIVE
ContributionPlan.status = COMPLETED
```

## Options considered

### Option A — Separate InsurancePremiumPlan

Rejected due to duplicated scheduling, reminders, statuses, retries, and event-generation behavior.

### Option B — Reuse generic contribution plan

Selected.

## Consequences

The name `InvestmentContributionPlan` becomes broader in semantic use than only investment contributions. A later rename may be considered if naming becomes confusing, but a rename is not required for the architecture to work.

## Risks

Product-specific premium features may eventually require additional metadata.

Mitigation: extend the plan generically where requirements are truly shared; create a new concept only when scheduling semantics fundamentally differ.

## Related

- [Domain Model](../domain-model.md)
- [Financial Flow Diagram](../diagrams/financial-flow.md)
