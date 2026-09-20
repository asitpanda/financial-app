# ADR-002: Separate Transactions from Investment Events

**Status:** Accepted

## Context

The application needs to represent both:

- movement of money through accounts;
- financial activity associated with a financial product.

These are related but not identical.

Examples:

- a PPF contribution moves cash and affects a product;
- PPF annual interest affects the product but may not represent a bank transaction;
- future expected contributions should not be represented as completed cash movement.

## Decision

Use:

```text
Transaction
    = actual cash/account movement

InvestmentEvent
    = financial activity associated with Investment
```

Where appropriate, link the `InvestmentEvent` to the corresponding `Transaction`.

## Options considered

### Option A — Put all financial activity in Transaction

Rejected because it does not naturally model:

- product-specific lifecycle events;
- expected recurring activity;
- opening investment history;
- product income without account movement;
- event status/source semantics.

### Option B — Put all cash and product activity in InvestmentEvent

Rejected because it weakens account-level cashflow and transfer semantics.

### Option C — Separate concepts with optional linkage

Selected.

## Consequences

A single real-world operation may produce two records.

Example:

```text
Bank transaction:       10,000 INVESTMENT
Investment event:       10,000 CONTRIBUTION
```

The relationship allows both cashflow and product history to remain explainable.

## Risks

Duplicate or inconsistent creation of linked records.

Mitigation:

- transactional persistence where required;
- idempotency;
- validation;
- reconciliation tests.

## Related

- [Domain Model](../domain-model.md)
- [Security and Data Integrity](../security-and-integrity.md)
