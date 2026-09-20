# Scalability and Operations

> **Purpose:** Define how the architecture should behave as data volume, product variety, integrations, and operational complexity grow.

## 1. Two dimensions of scale

The application must scale in two independent dimensions:

1. financial-record volume;
2. number and variety of supported financial products.

## 2. High-volume entities

Likely high-volume records include:

- `Transaction`;
- `InvestmentEvent`;
- `ValuationSnapshot`.

Common access patterns should remain efficient around:

- user;
- investment;
- date;
- status;
- event source;
- due date.

Indexes should be driven by actual query patterns and verified with production-like workloads.

## 3. Product variety

The number of product labels can grow much faster than genuine accounting behaviors.

Target model:

```text
Many product types
        ↓
Controlled taxonomy / metadata
        ↓
Small number of accounting treatments
        ↓
Stable accounting engine
```

Adding a new provider, mutual-fund family, insurer, or policy label should normally be configuration work.

## 4. Extension checklist

Before adding a new domain model or subsystem for a product, ask:

1. Can the existing `Investment` aggregate represent it?
2. Does the existing taxonomy support it?
3. Does an existing accounting treatment describe its financial behavior?
4. Can existing event types represent its financial activity?
5. Can `InvestmentContributionPlan` represent its recurring schedule?
6. Can `ValuationSnapshot` represent its valuation needs?
7. Can `InvestmentBenefit` represent contractual future payouts?
8. Only then: is a genuinely new domain concept required?

## 5. New accounting treatments

A new accounting treatment is justified only when existing treatments cannot model the product's economic behavior.

A new product name alone is insufficient.

Adding a new accounting treatment should require an ADR because it changes cross-cutting financial semantics.

## 6. Scheduling

Recurring-plan processing should be:

- retry-safe;
- idempotent;
- observable;
- deterministic;
- independent from actual payment confirmation.

A scheduler may create expected events.

Expected events must not become actual accounting until confirmed.

## 7. Imports

Imports may originate from:

- banks;
- brokers;
- historical onboarding;
- system-generated sources.

Import pipelines should follow:

```text
Receive
  ↓
Validate
  ↓
Normalize
  ↓
Deduplicate
  ↓
Persist authoritative fact
  ↓
Apply domain/accounting rules
  ↓
Update derived state
```

External source formats must not leak directly into domain accounting logic.

## 8. Read models and caching

Derived values such as:

- portfolio total;
- net worth;
- allocation;
- annual expenses;
- gain/loss;
- goal progress;

may be cached or materialized for performance.

Caching must not make the cache authoritative.

Recalculation or repair from authoritative records must remain possible.

## 9. Observability

Operational telemetry should support diagnosis of:

- recurring-plan failures;
- duplicate suppression;
- import failures;
- valuation failures;
- accounting-policy resolution failures;
- configuration lookup failures;
- stale derived-data detection.

Observability must avoid leaking unnecessary sensitive financial data.

## 10. Failure handling

Financial processing should prefer explicit states over silent failure.

Examples:

- expected;
- pending;
- confirmed;
- skipped;
- failed;
- cancelled.

Retry policy must distinguish transient infrastructure failures from invalid financial data.

## 11. Operational reconciliation

The application should support reconciliation checks such as:

```text
event-derived totalInvested
vs
stored/cached totalInvested

latest valuation
vs
currentValue

linked Transaction
vs
confirmed InvestmentEvent
```

These checks are especially useful after imports, migrations, and accounting-rule changes.

## 12. Migration strategy

Architectural changes affecting money semantics require:

- migration plan;
- backward compatibility;
- data backfill rules;
- reconciliation checks;
- rollback or repair strategy;
- explicit handling of historical interpretation.

## 13. Cost posture

The architecture favors low operational complexity by reusing:

- one common financial-product aggregate;
- one recurring-plan mechanism;
- one event model;
- one valuation model;
- a small accounting-policy set.

This reduces duplicate jobs, duplicate data models, duplicated reporting logic, and product-specific maintenance cost.
