# Technical Architecture

> **Scope:** Technical understanding of the client, server, persistence, runtime flows, and extension boundaries.

This document describes how the application is structured and how its parts interact. It does not define product requirements or UX specifications.

## 1. System shape

My Financial is a React client backed by a NestJS API and PostgreSQL persistence. The same server feature contracts support deterministic mock adapters for local development and tests.

```text
User
  -> React client
    -> Axios API client
      -> NestJS controller
        -> NestJS service
          -> stable repository
            -> datasource port
              -> Prisma adapter or mock adapter
                -> PostgreSQL or fixture state
```

The main technical boundaries are:

- **Client:** feature UI, forms, query cache, selectors, and HTTP integration.
- **Server:** authentication, DTO validation, application workflows, provider-independent repositories, and error normalization.
- **Persistence:** Prisma schema, SQL scripts, migrations, and provider adapters.
- **Reference data:** metadata and taxonomy used to classify financial products without embedding classification rules in UI code.

See [system context](./reference/diagrams/system-context.md), [domain overview](./reference/diagrams/domain-overview.md), [financial flow](./reference/diagrams/financial-flow.md), and [application wiring](./reference/diagrams/application-wiring.md).

## 2. Technology stack

### Client

- React 19
- TypeScript
- TanStack React Query
- React Hook Form
- Zod
- Zustand
- Axios
- MUI and Tailwind

### Server

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT authentication
- Swagger/OpenAPI

## 3. Backend architecture

### Standard feature layering

```text
Controller
  -> Service
    -> Stable Repository (<feature>.repository.ts)
      -> DataSource Port (<feature>.datasource.port.ts)
        -> Prisma Adapter (<feature>.prisma.repository.ts)
        -> Mock Adapter (<feature>.mock.repository.ts)
```

Responsibilities:

- **Controller:** route mapping, authentication guards, DTO binding, and HTTP responses.
- **Service:** application rules, workflow orchestration, and cross-feature operations.
- **Stable repository:** service-facing persistence entry point; contains no provider conditionals.
- **Datasource port:** contract shared by persistence implementations.
- **Prisma adapter:** database-backed persistence for `postgres` and `supabase`.
- **Mock adapter:** deterministic fixture-backed behavior for `mock`.

### Provider selection

`DB_PROVIDER` supports:

- `mock`: resolves mock datasource adapters.
- `postgres`: resolves Prisma-backed adapters.
- `supabase`: follows the same Prisma-backed path as `postgres`.

Provider normalization and binding are centralized in `server/src/database/db-provider.ts`. Services must not branch on the provider. Module dependency injection selects the adapter once.

```text
ConfigService(DB_PROVIDER)
  -> resolveDbProvider
    -> createProviderBackedBinding
      -> feature datasource token
        -> stable repository
          -> service
            -> controller
```

Datasource tokens use uppercase snake case, for example `TRANSACTION_DATA_SOURCE` and `INVESTMENT_DATA_SOURCE`.

### Backend feature structure

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

Feature folders use kebab-case for multi-word names. The active modules are registered from `server/src/app.module.ts`. `investment-goal-allocations` is currently scaffolded but not registered and should be treated as inactive infrastructure.

### Folder ownership agreement

- A server feature owns its NestJS module, controller, service, DTOs, repositories, datasource port, adapters, and persistence-facing types.
- A client feature owns its page, components, API module, hooks, schemas, selectors, mappers, services, and feature types.
- Shared code belongs in shared `common`, `components`, `utils`, or `types` areas only when it is genuinely used by multiple features.
- A server service depends on a stable repository, never directly on Prisma or a mock adapter.
- A client component depends on hooks and selectors, never directly on Axios or a feature API module.
- Cross-feature work is coordinated through service/module dependencies on the server and API/hooks on the client.
- Provider-specific behavior stays in dependency-injection bindings and adapters.
- Database-backed and mock adapters must preserve the same feature-facing record shape and behavior contract.

### Feature example: transactions

The transactions feature demonstrates the agreed structure on both sides of the application.

Server:

```text
server/src/transactions/
  transactions.module.ts
  transactions.controller.ts
  transactions.service.ts
  transaction.types.ts
  dto/
    create-transaction.dto.ts
    update-transaction.dto.ts
    record-contribution.dto.ts
    record-withdrawal.dto.ts
  repositories/
    transaction.repository.ts
    transaction.datasource.port.ts
    transaction.prisma.repository.ts
    transaction.mock.repository.ts
```

The server wiring is:

```text
TransactionsController
  -> TransactionsService
    -> TransactionRepository
      -> TRANSACTION_DATA_SOURCE
        -> TransactionPrismaRepository -> PrismaService -> PostgreSQL
        -> TransactionMockRepository -> mock data
```

`TransactionsModule` registers the controller, service, repository implementations, related feature modules, and the provider-backed datasource binding. The controller maps HTTP routes and DTOs; the service coordinates workflows such as recording a contribution; the repository hides the selected persistence adapter.

Client:

```text
client/src/features/transactions/
  Transactions.tsx
  components/
    TransactionViewDrawer.tsx
    TransactionsAddEditDrawer.tsx
  transaction.types.ts
  transactions.api.ts
  transactions.schema.ts
  transactions.selectors.ts
  transactions.service.ts
  useTransactions.ts
```

The client wiring is:

```text
Transactions.tsx / feature components
  -> useTransactions.ts
    -> transactions.service.ts (only for workflow orchestration)
    -> transactions.api.ts
      -> api/client.ts
        -> /api/transactions
          -> server TransactionsController
```

`useTransactions.ts` owns React Query keys, mutations, loading/error state, and invalidation. `transactions.api.ts` owns HTTP calls. `transactions.schema.ts` owns form validation. Selectors derive display data without making API calls. The feature service is used only where save behavior needs orchestration.

When a transaction mutation changes dashboard-visible data, the mutation invalidates both the feature query (`["transactions"]`) and the dashboard query (`["dashboard"]`). This is part of the feature integration contract, not component-level reload logic.

## 4. Code organization and naming agreement

This section defines where code belongs and how files are named. It is a technical ownership guide, not a replacement for automated formatting, linting, or TypeScript compiler rules.

### General rules

- Keep code close to the feature that owns the behavior.
- Use one primary responsibility per file.
- Use explicit names that describe the feature and layer.
- Do not create a wrapper file that only forwards a call without adding responsibility.
- Keep dependency direction moving from outer layers toward inner contracts.
- Do not make UI components, controllers, or adapters own rules belonging to another layer.
- Use feature-owned types at feature boundaries; use shared types only for genuinely shared contracts.

### Server file responsibilities

| File pattern | Responsibility | Must not contain |
|---|---|---|
| `<feature>.module.ts` | NestJS registration, imports, providers, and datasource binding | Business workflows |
| `<feature>.controller.ts` | Routes, HTTP parameters, guards, DTO binding, response mapping | Persistence queries or accounting rules |
| `<feature>.service.ts` | Use cases, validation orchestration, workflows, and cross-feature coordination | Provider-specific branches or raw Prisma access |
| `dto/*.dto.ts` | Request shape, transport validation, and Swagger metadata | Persistence models or database queries |
| `<feature>.repository.ts` | Stable service-facing persistence API | Provider selection |
| `<feature>.datasource.port.ts` | Provider-neutral persistence contract | Prisma or mock implementation details |
| `<feature>.prisma.repository.ts` | Prisma queries and database mapping | HTTP concerns or UI behavior |
| `<feature>.mock.repository.ts` | Mock/fixture implementation matching the datasource port | Different business semantics from the Prisma adapter |
| `<feature>.types.ts` | Feature-owned persistence and boundary record types | Unrelated feature records |
| `src/database/*` | Prisma lifecycle and provider binding utilities | Feature-specific workflows |
| `src/common/*` | Cross-feature infrastructure such as errors and date utilities | Feature-specific domain behavior |

Server naming patterns:

```text
transactions.controller.ts
transactions.service.ts
transactions.module.ts
transaction.types.ts
create-transaction.dto.ts
transaction.repository.ts
transaction.datasource.port.ts
transaction.prisma.repository.ts
transaction.mock.repository.ts
```

Use kebab-case for multi-word folders and files. Use PascalCase for classes, interfaces, and DTO types; use camelCase for methods and variables; use uppercase snake case for dependency-injection tokens.

### Client file responsibilities

| File pattern | Responsibility | Must not contain |
|---|---|---|
| `<Feature>.tsx` | Feature page composition and screen-level UI state | Direct Axios calls or persistence workflows |
| `components/*.tsx` | Reusable feature UI and event presentation | API calls or cache invalidation rules |
| `use<Feature>.ts` | React Query queries, mutations, loading/error state, and cache invalidation | JSX or HTTP implementation details |
| `<feature>.api.ts` | HTTP methods and response/request transport types | React state, React Query, notifications, or business workflows |
| `<feature>.service.ts` | Multi-step client workflows and mapping orchestration | Pass-through API wrappers |
| `<feature>.schema.ts` | Zod schemas and form validation rules | API calls or persistence decisions |
| `<feature>.selectors.ts` | Pure filtering, sorting, grouping, and view-model derivation | Side effects, API calls, or state mutation |
| `<feature>.mapper.ts` | Translation between form, API, and application models | React state, network calls, or validation |
| `<feature>.types.ts` | Feature-owned DTO, record, form, and view types | Unrelated feature types |

Client naming patterns:

```text
Transactions.tsx
components/TransactionViewDrawer.tsx
components/TransactionsAddEditDrawer.tsx
transaction.types.ts
transactions.api.ts
transactions.schema.ts
transactions.selectors.ts
transactions.service.ts
useTransactions.ts
```

Use PascalCase for React component files and component names. Use camelCase or lowercase kebab-style names for non-component feature modules, following the existing feature convention. Hooks start with `use`; selectors describe the derived result; API modules use the plural feature name.

### Dependency direction

```text
Client component
  -> client hook
    -> client service (optional)
      -> client API
        -> Axios client
          -> server controller
            -> server service
              -> stable repository
                -> datasource port
                  -> adapter
```

Rules:

- Components may use hooks, selectors, schemas, and local components.
- Hooks may use API modules, client services, and the query client.
- API modules may use the shared Axios client and feature types.
- Server controllers may use services and DTOs.
- Server services may use repositories and explicitly registered collaborating services.
- Repositories may use datasource ports; concrete adapters implement ports.
- Lower layers must not import UI components, controllers, or higher-level workflows.

### Where new code goes

Before adding a file, identify the owner:

1. UI rendering or interaction: feature `components/` or feature page.
2. Client server-state behavior: feature hook.
3. HTTP transport: feature API module.
4. Multi-call client workflow: feature service.
5. Server HTTP boundary: controller or DTO.
6. Server use case: service.
7. Persistence contract: datasource port and stable repository.
8. Provider implementation: Prisma or mock repository.
9. Pure derived data: selector.
10. Cross-feature infrastructure: `server/src/common`, `server/src/database`, or an existing shared client area.

If the code does not have a clear owner, do not create a generic `utils`, `helpers`, or `common` file as a first response. Re-check the feature boundary and place the code with the behavior it owns.

### Adding a persisted server feature

1. Add or update the Prisma model and SQL representation.
2. Add the feature-owned record and input types.
3. Add DTOs and server-side validation.
4. Add the datasource port, Prisma adapter, mock adapter, and provider binding.
5. Add the stable repository.
6. Implement service workflows and controller routes.
7. Update client API modules, hooks, cache invalidation, and UI only where needed.
8. Update schema, diagrams, and this architecture document when the technical boundary changes.

## 5. Frontend architecture

The client is feature-first. A feature may contain:

```text
features/<feature>/
  components/
  types/
  <feature>.api.ts
  <feature>.service.ts        optional
  <feature>.selectors.ts
  <feature>.schema.ts
  <feature>.mapper.ts         only when models differ
  use<Feature>.ts
  <Feature>.tsx
```

### Read flow

```text
Component
  -> React Query hook
    -> feature API
      -> Axios client
        -> backend
```

The response returns through the API module into the React Query cache, then through selectors into components.

### Write flow

Simple CRUD uses `Component -> Hook -> API -> backend`.

Complex workflows may use `Component -> Hook -> Service -> API -> backend`.

Services are introduced only when a workflow has real orchestration, such as multiple API calls, create/update decisions, mapping, or business-rule coordination. Pass-through wrappers should not be added.

### Layer responsibilities

- **Component:** renders UI, handles local UI state, calls hooks and selectors. It does not call Axios or implement persistence workflows.
- **Hook:** owns React Query reads, mutations, loading/error state, retries, and cache invalidation.
- **API:** owns HTTP calls only. It does not contain React Query, UI behavior, or notifications.
- **Service:** owns client-side workflow orchestration when needed.
- **Schema:** owns runtime form validation and React Hook Form integration.
- **Mapper:** translates between form, API, and application models only when shapes differ.
- **Selector:** computes pure derived views, filtering, sorting, grouping, and aggregates.

## 6. Domain and data boundaries

The application keeps these technical concepts separate:

| Concept | Technical responsibility |
|---|---|
| `User` | Ownership and authorization boundary |
| `FinancialAccount` | Where money is held or moved |
| `Transaction` | Actual account/cash movement |
| `Investment` | Common financial-product aggregate and lifecycle |
| `InvestmentEvent` | Financial activity associated with an investment |
| `InvestmentContributionPlan` | Expected recurring activity and event generation |
| `ValuationSnapshot` | Observed value at a point in time |
| `InvestmentBenefit` | Expected or contractual future entitlement |
| Product metadata/taxonomy | Product classification and display dimensions |
| Accounting treatment | Centralized interpretation of financial behavior |
| `Goal` | Financial objective, separate from product ownership |
| `Category` | User-facing transaction classification |

### Common financial-product aggregate

`Investment` is reused for multiple long-term financial products so lifecycle, ownership, scheduling, events, valuation, and reporting infrastructure are not duplicated. The existence of an investment row does not mean every payment is invested capital; accounting treatment determines behavior.

### Cash movement, activity, and valuation

```text
Transaction       = actual cash/account movement
InvestmentEvent   = product financial activity
ValuationSnapshot = observed product value
```

A real-world operation may create a transaction and an investment event linked together. A valuation change does not automatically create an event or transaction.

### Configuration-driven accounting

Product identity and financial behavior are separate. Accounting treatment is resolved centrally rather than inferred from product names or display taxonomy.

Initial treatments are:

- `INVESTMENT`
- `INSURANCE_SAVINGS`
- `PROTECTION_EXPENSE`

This keeps reporting, contribution totals, expenses, portfolio inclusion, and valuation eligibility consistent across modules.

### Recurring plans and benefits

`InvestmentContributionPlan` is reused for investment contributions and insurance premiums because both require amount, cadence, dates, reminders, status, and event generation. The generated event type distinguishes `CONTRIBUTION` from `PREMIUM`.

`InvestmentBenefit` represents an expected entitlement. It is not cash history or a valuation. When realized, it can produce an investment event and a linked transaction where money moves.

## 7. Cross-cutting runtime contracts

### Request logging

The server generates or propagates `x-request-id`, returns it in the response, and includes it in request/response logs. Sensitive keys are sanitized. `LOG_FORMAT=json` enables machine-readable logs.

### Validation

Global validation uses `whitelist`, `transform`, and `forbidNonWhitelisted`. Validation errors are normalized with `message`, optional `field`, and `details` entries. API date fields accept ISO datetimes or `YYYY-MM-DD`; adapters normalize valid values before persistence.

### Error contract

The global exception filter normalizes HTTP, Prisma, and unknown errors into a payload containing:

```json
{
  "requestId": "...",
  "timestamp": "...",
  "path": "...",
  "method": "GET",
  "statusCode": 400,
  "code": "...",
  "message": "...",
  "field": "...",
  "details": []
}
```

Known Prisma mappings include `P2002` to `CONFLICT`, `P2003` to `INVALID_REFERENCE`, and `P2025` to `NOT_FOUND`.

### Ownership and data integrity

Every user-scoped identifier must be checked against the authenticated user. Client input does not determine authoritative accounting treatment, ownership, historical interpretation, or portfolio behavior.

Financial operations that can retry must be idempotent where practical. Multi-record financial actions should persist atomically. Derived totals and caches must be reconstructable from authoritative records.

## 8. Technical constraints

- Keep provider selection in module DI bindings only.
- Do not inject Prisma adapters directly into services.
- Keep mock and database-backed adapter shapes compatible.
- Keep repository naming and layering consistent across features.
- Keep `Transaction`, `InvestmentEvent`, and `ValuationSnapshot` semantically separate.
- Do not infer accounting behavior from product names or UI categories.
- Preserve historical interpretation when configuration changes.
- Treat expected events as non-realized until confirmed.
- Keep user ownership checks on the server.
- Update technical diagrams and schema documentation when boundaries or data relationships change.
