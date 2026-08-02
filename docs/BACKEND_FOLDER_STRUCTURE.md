# Backend Folder Structure

## Goal

Define clear ownership for each backend folder and enforce frozen naming/layering conventions.

## Top-Level Backend Layout

```text
server/
  prisma/
    schema.prisma
  src/
    app.module.ts
    main.ts
    auth/
    categories/
    financial-accounts/
    goals/
    investments/
    investment-asset-taxonomy/
    investment-contribution-plans/
    investment-events/
    investment-goal-allocations/
    transactions/
    valuation-snapshots/
    database/
    common/
    domain/
    mockdata/
```

## Core Infrastructure Folders

### src/database

- `prisma.service.ts`: Prisma client lifecycle and DB access abstraction.
- `database.module.ts`: database providers exported across app.
- `db-provider.ts`: DB provider normalization and provider-backed binding helper.

### src/common/errors

- global error contract types.
- global exception filter for HTTP + Prisma + unknown error normalization.

### src/domain

- canonical TypeScript record-level data contracts (`types.ts`).
- acts as shared shape reference for adapters and mock fixtures.

### src/mockdata

- fixture datasets and local development mock state.
- used by `*.mock.repository.ts` adapters.

## Feature Module Template

Each feature folder should contain:

```text
<feature>/
  <feature>.controller.ts
  <feature>.service.ts
  <feature>.module.ts
  dto/
  repositories/
    <feature>.repository.ts
    <feature>.datasource.port.ts
    <feature>.prisma.repository.ts
    <feature>.mock.repository.ts
```

## Repository Layer Responsibilities

- `<feature>.repository.ts`
  - stable service-facing repository.
  - no provider conditionals.

- `<feature>.datasource.port.ts`
  - adapter contract shared by mock and prisma implementations.

- `<feature>.prisma.repository.ts`
  - persistence logic for DB-backed providers (`postgres` and `supabase`).

- `<feature>.mock.repository.ts`
  - mock/fixture behavior for `mock` provider.

## Module Provider Binding Pattern

In `<feature>.module.ts`:

- register prisma adapter class.
- register mock adapter class.
- register provider-backed token using `createProviderBackedBinding`.
- inject token into stable repository.

This isolates provider choice to DI wiring and keeps service code deterministic.

## DTO And Service Boundaries

- DTO folder owns input contract definitions and validation decorators.
- Service layer owns business orchestration and cross-feature rules.
- Controller layer owns route/auth mapping only.

## Auth Module

Auth remains a direct service flow:

- register/login/me endpoints.
- JWT strategy + guard.
- no feature provider split in auth module.

## Frozen Conventions

- Keep folder names kebab-case for multi-word features.
- Keep repository files in each feature `repositories/` folder.
- Keep datasource token names uppercase snake-case (example: `TRANSACTION_DATA_SOURCE`).
- Avoid legacy file naming (`transaction.repository.interface.ts`, `supabase-*.repository.ts`, `firebase-*`).

## Documentation Cross-References

- Architecture: docs/ARCHITECTURE.md
- Data model and schema: docs/DATA_MODEL_AND_SCHEMA.md
- ERD: docs/data-model/INVESTMENT_ER_DIAGRAM.md
