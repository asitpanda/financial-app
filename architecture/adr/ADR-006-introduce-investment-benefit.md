# ADR-006: Introduce `InvestmentBenefit`

**Status:** Proposed

## Context

Some products define future contractual benefits that are neither current financial events nor valuations.

Examples:

- money-back payments;
- maturity benefits;
- survival benefits;
- bonuses;
- return of premium;
- death benefits.

Storing these as transactions before they are received would create false cash history.

Storing them as valuation snapshots would conflate contractual entitlement with observed current value.

## Decision

Introduce a generic `InvestmentBenefit` child concept.

Suggested types:

```text
MONEY_BACK
MATURITY
SURVIVAL
BONUS
RETURN_OF_PREMIUM
DEATH_BENEFIT
OTHER
```

Suggested fields:

```text
investmentId
benefitType
amount
benefitDate
status
notes
meta
```

A benefit records expected/contractual entitlement.

When a benefit is actually realized:

```text
InvestmentBenefit
    -> realized by InvestmentEvent
    -> linked to Transaction when cash moves
```

## Options considered

### Option A — Store expected benefits as InvestmentEvents

Rejected because an expected contractual benefit is not yet actual financial activity.

### Option B — Store expected benefits in JSON metadata

Rejected as the primary representation because benefits need queryable dates, statuses, amounts, and lifecycle.

### Option C — Introduce InvestmentBenefit

Selected.

## Consequences

Benefits become independently queryable for:

- future cashflow;
- maturity schedules;
- policy views;
- reminders;
- benefit realization.

## Risks

Some benefit payments may contain mixed principal and income components.

Mitigation: actual realization must preserve economic composition through event structure or explicit allocation metadata.

## Related

- [Domain Model](../domain-model.md)
- [Data and Accounting](../data-and-accounting.md)
