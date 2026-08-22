# Data Model And Schema Guide

## Source Of Truth Order

Data shape and relationships are governed in this order:

1. server/prisma/schema.prisma
2. feature-owned `*.types.ts` files (for example `investments/investment.types.ts`, `investment-events/investment-event.types.ts`, `valuation-snapshots/valuation-snapshot.types.ts`, `investment-contribution-plans/investment-contribution-plan.types.ts`)
3. server/src/mockdata/\*.ts

Rules:

- Prisma is the canonical persistence schema.
- Feature-owned record types must mirror Prisma field names and nullability for the models that feature owns.
- Mock data must stay shape-compatible with feature-owned record types.
- `server/src/domain/types.ts` is a shared-core placeholder only; do not add feature-owned record shapes there.

## Active Models

Current core models:

- User
- Category
- FinancialAccount
- Transaction
- Goal
- Investment
- AppMetaConfigRef
- InvestmentAssetTaxonomy
- InvestmentEvent
- InvestmentContributionPlan
- ValuationSnapshot

## Relationship Highlights

- User owns categories, accounts, transactions, goals, investments, and valuation snapshots.
- User owns investment asset taxonomy nodes (`investment_asset_taxonomy.userId`).
- Category classifies transactions and goals.
- Goal is optionally linked from transactions.
- FinancialAccount can be source/destination for transactions and is the optional primary account on an investment (`investment.accountId`); it does not directly fund investment events or contribution plans.
- `AppMetaConfigRef` is a self-referencing, shared reference table (`module`/`configType`/`parentId`) that is the source of truth for investment `assetType`/`assetCategory` classification; `investment.assetTypeMetaId`/`assetCategoryMetaId` are required FKs into it.
- Investment can reference primary account, required asset type/category meta refs, and optional taxonomy, and owns events, plans, snapshots.
- Asset taxonomy is hierarchical (`parentId` self-reference), tenant-scoped by user, and remains an optional organizational bucket; it can carry optional `defaultAssetTypeMetaId`/`defaultAssetCategoryMetaId` hints into `AppMetaConfigRef` but is never the authoritative source of asset classification.
- Transaction and investment event have a one-way optional link: `investment_event.linkedTransactionId` (unique) references `transaction.id`; there is no reverse FK on transaction.
- Investment events support recurring orchestration fields (`recurringPlanId`, `dueDate`, `status`, `eventSource`, `sequenceNumber`).
- Investment contribution plans support recurring history mode and scheduler metadata (`historicalImportMode`, `lastGeneratedDueDate`); supported modes are `OPENING_BALANCE` and `TRACK_FROM_TODAY`.

## Referential Integrity

Common on-delete behavior:

- owner links often use `Cascade`.
- optional references often use `SetNull`.
- required domain references (for example transaction category) use `Restrict`.

This balance preserves historical records while preventing invalid hard deletes.

Additional ownership rule:

- `investment_asset_taxonomy.userId` is a required FK to `users.id` with cascade delete.
- `investment.assetTypeMetaId`/`assetCategoryMetaId` use `Restrict` on delete since a valid classification is required; `app_meta_config_ref.parentId` and taxonomy default meta FKs use `SetNull`.

## Indexing Strategy

Schema indexes are present on high-traffic filter dimensions such as:

- `userId`
- date fields (`date`, `snapshotDate`, `nextDueDate`)
- common relationship keys (`categoryId`, `goalId`, `investmentId`, `accountId`, `sourceAccountId`)
- type/status dimensions where used by feature queries

Notable recent indexes:

- `investment_asset_taxonomy_userId_idx`
- `investments_assetTypeMetaId_idx`
- `investments_assetCategoryMetaId_idx`
- `investment_asset_taxonomy_defaultAssetTypeMetaId_idx`
- `investment_asset_taxonomy_defaultAssetCategoryMetaId_idx`
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
4. Update the owning feature's `*.types.ts` if field signatures changed.
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
