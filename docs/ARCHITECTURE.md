# My Financial Frozen Architecture

## Purpose

This document is the frozen backend architecture reference for runtime behavior, module composition, provider selection, and repository layering.

## Scope

- Backend: NestJS, Prisma, provider strategy, logging, and error contracts.
- Data model alignment across Prisma, domain record types, and mock fixtures.
- Feature module layering and naming conventions.

## Runtime Modes

`DB_PROVIDER` accepts three values:

- `mock`: feature modules resolve mock data-source adapters.
- `postgres`: feature modules resolve Prisma-backed adapters.
- `supabase`: treated as database-backed and resolved to Prisma-backed adapters.

Provider normalization is centralized in server/src/database/db-provider.ts.

## Provider Resolution Model

All feature modules use the same provider-backed binding helper.

Flow:

```text
ConfigService(DB_PROVIDER)
  -> resolveDbProvider
  -> createProviderBackedBinding
  -> feature data source token
  -> stable repository
  -> service
  -> controller
```

Example token pattern:

- `TRANSACTION_DATA_SOURCE`
- `GOAL_DATA_SOURCE`
- `CATEGORY_DATA_SOURCE`
- `INVESTMENT_DATA_SOURCE`

## Standard Backend Layering

Each feature follows this layering:

```text
Controller
  -> Service
    -> Stable Repository (<feature>.repository.ts)
      -> DataSource Port (<feature>.datasource.port.ts)
        -> Prisma Adapter (<feature>.prisma.repository.ts)
        -> Mock Adapter (<feature>.mock.repository.ts)
```

Responsibilities:

- Controller: HTTP contract, DTO binding, auth guards.
- Service: business rules, workflow orchestration, cross-feature operations.
- Stable Repository: feature-facing persistence entry point.
- DataSource Port: implementation contract for provider adapters.
- Prisma Adapter: database-backed persistence via PrismaService.
- Mock Adapter: deterministic mock/fixture-backed behavior.

## Naming Convention

Repository file names are frozen to:

- `<feature>.repository.ts`
- `<feature>.datasource.port.ts`
- `<feature>.prisma.repository.ts`
- `<feature>.mock.repository.ts`

Class/interface names follow file naming (no legacy supabase/firebase class names in repository adapters).

## Cross-Cutting Runtime

### Request/Response Logging

Configured in server/src/main.ts:

- request id generated per request and returned as `x-request-id`.
- request logs include method, path, provider, origin.
- body sanitization masks sensitive keys (`password`, `token`, `accessToken`, `refreshToken`, `authorization`).
- response logs include status and duration.
- `LOG_FORMAT=json` enables JSON logs for machine parsing.

### Validation Contract

Global `ValidationPipe` is configured with:

- `whitelist: true`
- `transform: true`
- `forbidNonWhitelisted: true`

Validation errors are flattened to:

```json
{
  "message": "...",
  "field": "...",
  "details": [{ "field": "...", "message": "..." }]
}
```

### Global Exception Contract

Global exception filter (server/src/common/errors/global-exception.filter.ts) normalizes:

- `HttpException`
- Prisma known errors (`P2002`, `P2003`, `P2025`)
- unknown runtime errors

Standard error payload includes:

- `requestId`
- `timestamp`
- `path`
- `method`
- `statusCode`
- `code`
- `message`
- optional `field`
- optional `details`

## Module Registration

App-level module composition is defined in server/src/app.module.ts and currently includes:

- Auth
- Categories
- Financial Accounts
- Goals
- Transactions
- Investments
- Investment Asset Taxonomy
- Investment Events
- Investment Contribution Plans
- Valuation Snapshots

## Architecture Guardrails

To keep architecture stable:

- Do not bypass stable repositories from services.
- Do not inject Prisma adapters directly into services.
- Keep provider selection only in module provider bindings.
- Keep provider value normalization only in db-provider.ts.
- Keep DTO validation and error shaping centralized in main.ts + global exception filter.

## Change Policy

When adding a new feature with persistence:

1. Add a datasource port.
2. Add a mock adapter.
3. Add a prisma adapter.
4. Add provider-backed token binding in module.
5. Add stable repository using the token.
6. Keep service/controller unaware of provider selection details.
