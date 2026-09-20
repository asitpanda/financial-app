# Security and Data Integrity

> **Purpose:** Define mandatory security, authorization, consistency, historical-integrity, and auditability rules.

## 1. Ownership boundary

Financial data is user-scoped.

Incoming identifiers such as:

```text
investmentId
transactionId
accountId
goalId
```

must never be treated as authorization.

Every operation must verify that the target entity belongs to, or is valid within, the authenticated user's scope.

## 2. Server-side financial authority

Clients may request operations.

Clients must not determine authoritative:

- accounting treatment;
- portfolio inclusion;
- expense treatment;
- gain/loss eligibility;
- net-worth impact;
- historical interpretation.

These rules are resolved in trusted server-side application/domain logic.

## 3. Sensitive data

Financial data is sensitive.

Special care is required for:

- account references;
- masked numbers;
- policy/reference numbers;
- balances;
- investment values;
- transaction details;
- imported financial records.

Avoid unnecessary sensitive values in:

- logs;
- traces;
- analytics;
- exception messages;
- support tooling.

## 4. Configuration protection

Product taxonomy and accounting-treatment configuration can materially change financial reporting.

Configuration changes must be:

- authorized;
- validated;
- auditable;
- backward-compatible or explicitly migrated.

## 5. Historical correctness

A configuration change must not silently rewrite the meaning of historical financial activity.

Example:

```text
Product originally = PROTECTION_EXPENSE
Later changed       = INSURANCE_SAVINGS
```

Historical reports must not silently reinterpret old premiums.

Long-term implementation may use one of:

- effective-dated configuration;
- accounting-treatment snapshot on `Investment`;
- accounting-treatment snapshot on relevant events;
- another versioned mechanism with equivalent guarantees.

The implementation mechanism may evolve. Preserving historical interpretation is the invariant.

## 6. Idempotency

Any operation that may retry must be designed to avoid duplicate financial facts.

Examples:

- recurring event generation;
- bank imports;
- broker imports;
- historical imports;
- benefit realization;
- external valuation ingestion.

Idempotency may be enforced with:

- unique constraints;
- external source IDs;
- idempotency keys;
- deterministic natural keys.

## 7. Transactional consistency

Where one business action creates multiple authoritative records, persist them atomically where practical.

Example:

```text
Confirm contribution
    -> Transaction
    -> InvestmentEvent
    -> aggregate/read-model update
```

A partial failure must not leave contradictory financial history.

Use database transactions or equivalent consistency guarantees.

## 8. Auditability

Audit-sensitive actions include:

- manual corrections;
- event-status changes;
- historical imports;
- valuation overrides;
- product reclassification;
- accounting-treatment changes;
- benefit realization;
- administrative configuration changes.

Where risk warrants it, retain:

```text
who
what
when
previous value
new value
reason/source
```

## 9. Event status integrity

Only realized/confirmed events may alter realized financial totals.

Changing an event from `CONFIRMED` back to a non-realized state must be treated as a controlled reversal/correction, not an incidental field edit.

## 10. Referential integrity

Relationships among:

- `User`;
- `FinancialAccount`;
- `Transaction`;
- `Investment`;
- `InvestmentEvent`;
- `InvestmentContributionPlan`;
- `ValuationSnapshot`;
- `InvestmentBenefit`;

must preserve ownership boundaries and avoid cross-user references.

## 11. Derived data

Derived fields and cached read models must be reconstructable from authoritative facts and accounting policies.

If a cache or derived total disagrees with authoritative history, authoritative records win and derived state must be repairable.

## 12. Testing expectations

Security- and integrity-critical rules require automated tests, including:

- cross-user access denial;
- duplicate recurring-generation protection;
- duplicate import protection;
- event-status accounting behavior;
- historical opening behavior;
- configuration-version behavior;
- rollback on partial financial operations;
- decimal precision and reconciliation.
