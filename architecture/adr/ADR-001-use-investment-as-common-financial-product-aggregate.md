# ADR-001: Use `Investment` as the Common Financial-Product Aggregate

**Status:** Accepted

## Context

The application needs to represent multiple long-term financial products including traditional investments and insurance-related products.

Creating a top-level model per product family would duplicate lifecycle, scheduling, events, reporting, ownership, and integration concerns.

The existing `Investment` model already provides generic product identity, lifecycle, taxonomy, financial events, contribution plans, insurance cover, and valuation relationships.

## Decision

Use `Investment` as the common aggregate for long-term financial products managed by the wealth/financial-product domain.

This may include:

- mutual funds;
- stocks;
- deposits;
- PPF/NPS/EPFO;
- ULIPs;
- endowment/money-back policies;
- protection insurance products that require financial-product lifecycle and premium tracking.

The existence of an `Investment` record does **not** imply that every payment counts as invested capital.

Financial behavior is determined separately through accounting treatment.

## Options considered

### Option A — Separate model per product type

Rejected because it creates duplicated:

- lifecycle logic;
- scheduling;
- transaction integration;
- reporting;
- import handling;
- persistence patterns.

### Option B — Common aggregate with configurable behavior

Selected.

It provides stable product ownership while allowing multiple financial behaviors.

## Consequences

### Positive

- lower schema growth;
- consistent lifecycle;
- reusable event and scheduling mechanisms;
- easier cross-product reporting;
- new product labels can often be added through configuration.

### Negative

- the aggregate must not become a generic dumping ground;
- downstream code must not assume all `Investment` rows behave like stocks or mutual funds;
- product behavior requires explicit accounting semantics.

## Risks

The main risk is incorrect portfolio logic based on the assumption:

```text
exists in Investment
    -> invested capital
```

Mitigation: accounting treatment is authoritative for financial behavior.

## Related

- [Domain Model](../domain-model.md)
- [Data and Accounting](../data-and-accounting.md)
- [ADR-004](./ADR-004-use-config-driven-accounting-treatment.md)
