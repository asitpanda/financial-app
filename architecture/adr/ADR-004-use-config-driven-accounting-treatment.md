# ADR-004: Use Configuration-Driven Accounting Treatment

**Status:** Accepted

## Context

The common `Investment` aggregate can represent products with fundamentally different economic behavior.

Examples:

```text
Mutual Fund           -> invested capital
PPF                   -> invested capital
Money Back Policy     -> long-term insurance savings
Health Insurance      -> protection expense
Term Insurance        -> protection expense
```

Product taxonomy alone is insufficient because multiple insurance products can have different accounting behavior.

Hard-coding behavior by product name would be fragile and difficult to scale.

## Decision

Introduce a configuration-driven accounting treatment independent from product display names.

Initial treatments:

```text
INVESTMENT
INSURANCE_SAVINGS
PROTECTION_EXPENSE
```

Accounting treatment controls:

- `totalInvested` behavior;
- expense behavior;
- portfolio participation;
- valuation expectations;
- gain/loss eligibility;
- net-worth participation;
- reporting semantics.

Accounting logic is centralized in an accounting-policy layer.

## PREMIUM event

Add/use `PREMIUM` as a first-class `InvestmentEventType`.

Examples:

```text
PPF contribution        -> CONTRIBUTION
LIC premium             -> PREMIUM
Health premium          -> PREMIUM
```

The same `PREMIUM` event can have different accounting effects depending on treatment.

## Accounting rules

| Treatment | Confirmed payment | `totalInvested` | Expense |
|---|---|---:|---:|
| `INVESTMENT` | `CONTRIBUTION` | Increase | No |
| `INSURANCE_SAVINGS` | `PREMIUM` | Increase | Usually No |
| `PROTECTION_EXPENSE` | `PREMIUM` | No change | Increase |

## Options considered

### Option A — Hard-code by product name

Rejected.

### Option B — Use product category such as Insurance vs Investment

Rejected because insurance products have more than one accounting behavior.

### Option C — Configuration-driven accounting treatment

Selected.

## Historical compatibility

Configuration changes must not silently reinterpret historical activity.

The implementation should preserve effective historical accounting treatment through versioned/effective configuration or snapshots with equivalent guarantees.

## Consequences

### Positive

- scalable product onboarding;
- centralized accounting behavior;
- reduced reporting inconsistency;
- clear separation of product identity and financial behavior.

### Negative

- configuration becomes financially sensitive;
- configuration governance and historical compatibility become required.

## Related

- [Data and Accounting](../data-and-accounting.md)
- [Security and Data Integrity](../security-and-integrity.md)
