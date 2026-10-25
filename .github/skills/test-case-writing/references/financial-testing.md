# Financial Testing Rules

Apply relevant rules at client, service, repository, and API boundaries.

- Use exact numeric/decimal representations appropriate to the layer.
- Do not use imprecise floating-point equality for money unless an explicit domain-justified tolerance is required.
- Test positive, negative, zero, null, rounding, precision, and sign-sensitive behavior.
- Preserve currency identity; do not compare different currencies as though directly equivalent.
- Test conversion boundaries and rounding rules where conversion occurs.
- Test date-only versus timestamp semantics, timezone boundaries, recurring dates, maturity dates, month/year/period boundaries, and leap/calendar behavior when relevant.
- Preserve accounting relationships among contributions, withdrawals, income, valuation, balances, allocations, and transaction totals.
- Verify derived totals, percentages, and aggregates with empty, partial, stale, and malformed inputs when the layer handles them.
- Test mutation idempotency, duplicate submission, retry, and rollback where operations change financial state.
- Verify authorization, ownership, account relationships, and cross-entity access boundaries.
- Verify API payloads, normalization, error mapping, status contracts, and persistence mapping when those are owned by the subject.
- Never alter expected values merely to make a failing test pass. Establish the correct domain expectation first.
