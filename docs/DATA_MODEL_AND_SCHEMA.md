# Data Model And Schema Guide

## Source Of Truth Order

Data shape and relationships are governed in this order:

1. server/prisma/schema.prisma
2. server/src/domain/types.ts
3. server/src/mockdata/\*.ts

Rules:

- Prisma is the canonical persistence schema.
- Domain record types must mirror Prisma field names and nullability.
- Mock data must stay shape-compatible with domain record types.

## Active Models

Current core models:

- User
- Category
- FinancialAccount
- Transaction
- Goal
- Investment
- InvestmentAssetTaxonomy
- InvestmentEvent
- InvestmentContributionPlan
- ValuationSnapshot

## Relationship Highlights

- User owns categories, accounts, transactions, goals, investments, and valuation snapshots.
- User owns investment asset taxonomy nodes (`investment_asset_taxonomy.userId`).
- Category classifies transactions and goals.
- Goal is optionally linked from transactions.
- FinancialAccount can be source/destination for transactions and can fund investment events/plans.
- Investment can reference primary account and taxonomy, and owns events, plans, snapshots.
- Asset taxonomy is hierarchical (`parentId` self-reference) and tenant-scoped by user.
- Transaction and investment event have optional bi-directional linkage fields.
- Investment events support recurring orchestration fields (`recurringPlanId`, `dueDate`, `status`, `eventSource`, `sequenceNumber`).
- Investment contribution plans support recurring history mode and scheduler metadata (`historicalImportMode`, `lastGeneratedDueDate`).

## Referential Integrity

Common on-delete behavior:

- owner links often use `Cascade`.
- optional references often use `SetNull`.
- required domain references (for example transaction category) use `Restrict`.

This balance preserves historical records while preventing invalid hard deletes.

Additional ownership rule:

- `investment_asset_taxonomy.userId` is a required FK to `users.id` with cascade delete.

## Indexing Strategy

Schema indexes are present on high-traffic filter dimensions such as:

- `userId`
- date fields (`date`, `snapshotDate`, `nextDueDate`)
- common relationship keys (`categoryId`, `goalId`, `investmentId`, `accountId`, `sourceAccountId`)
- type/status dimensions where used by feature queries

Notable recent indexes:

- `investment_asset_taxonomy_userId_idx`
- `investment_events_recurringPlanId_idx`
- `investment_events_dueDate_idx`
- `investment_events_status_idx`

## Provider Behavior And Schema

Provider mode does not change schema shape:

- `mock` returns mock adapter data using schema-compatible records.
- `postgres` and `supabase` both use Prisma over PostgreSQL.

This guarantees API contract consistency regardless of provider mode.

## Sync Checklist For Schema Changes

When changing schema:

1. Update server/prisma/schema.prisma.
2. Run `npm run prisma:generate` in server.
3. Apply schema to DB (`npm run prisma:push` or migration flow).
4. Update server/src/domain/types.ts if field signatures changed.
5. Update mock fixtures in server/src/mockdata as needed.
6. Verify repository adapters map fields correctly.
7. Rebuild server (`npm run build`).

## ER Diagram

Canonical ER diagram lives in:

- docs/data-model/INVESTMENT_ER_DIAGRAM.md

Use that file for relationship visualization and high-level entity inventory.

## API Error Implications

Schema-level violations are normalized by global exception handling:

- Unique violations (`P2002`) -> `CONFLICT`
- FK violations (`P2003`) -> `INVALID_REFERENCE`
- Missing record (`P2025`) -> `NOT_FOUND`

Consumers should rely on normalized `code` and `message` rather than raw Prisma errors.
