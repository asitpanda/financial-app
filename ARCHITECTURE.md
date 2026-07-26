# Frontend Architecture Guidelines

## Technology Stack

- React 19
- TypeScript
- TanStack React Query
- React Hook Form
- Zod
- Zustand
- Axios
- MUI

---

# Design Principles

1. Feature-first architecture.
2. Keep layers small and focused.
3. Introduce a layer only when it owns a real responsibility.
4. Avoid pass-through wrappers.
5. Prefer composition over abstraction.
6. Grow architecture as complexity grows.

---

# Feature Structure

```text
features/
└── transactions/
    ├── components/
    │   ├── AddTransactionModal.tsx
    │   ├── TransactionTable.tsx
    │   └── TransactionViewDrawer.tsx
    │
    ├── types/
    │   ├── index.ts
    │   └── transaction.types.ts
    │
    ├── transactions.api.ts
    ├── transactions.service.ts        (optional)
    ├── transactions.selectors.ts
    ├── transactions.schema.ts
    ├── transactions.mapper.ts         (only if needed)
    ├── useTransactions.ts
    └── Transactions.tsx
```

---

# Architecture

## READ FLOW

```text
Component
    │
    ▼
Feature Hook (React Query)
    │
    ▼
Feature API
    │
    ▼
Axios Client
    │
    ▼
Backend
```

Response

```text
Backend
    │
    ▼
Axios Client
    │
    ▼
Feature API
    │
    ▼
React Query Cache
    │
    ▼
Selectors
    │
    ▼
Component
```

---

## WRITE FLOW

Simple CRUD

```text
Component
    │
    ▼
Feature Hook
    │
    ▼
Feature API
    │
    ▼
Backend
```

Complex Workflow

```text
Component
    │
    ▼
Feature Hook
    │
    ▼
Feature Service
    │
    ▼
Feature API
    │
    ▼
Backend
```

Service is introduced ONLY when business workflow exists.

---

# Layer Responsibilities

## Component

Responsibilities

- Render UI
- Handle UI events
- Hold local UI state
- Call hooks
- Call selectors

Never

- Call APIs
- Use Axios
- Perform business workflow
- Validate forms

---

## Feature Hook

Responsibilities

- React Query
- useQuery
- useMutation
- Loading
- Error
- Cache invalidation
- Retry
- Expose feature operations

Reads

```text
Hook → API
```

Complex Writes

```text
Hook → Service → API
```

---

## Feature Service

Create this layer ONLY when needed.

Responsibilities

- Business workflow
- Create vs Update decision
- Validation orchestration
- Mapping orchestration
- Multiple API calls
- Business rules
- Error translation

Never create wrappers like

```ts
getTransactions() {
    return transactionsApi.getAll();
}
```

If the service only forwards an API call, remove it.

---

## Feature API

Responsibilities

- HTTP communication only
- GET
- POST
- PUT/PATCH
- DELETE

Never

- Business logic
- Validation
- React Query
- UI logic
- Toasts
- Navigation

---

## Schema

Responsibilities

- Runtime validation
- Zod schemas
- React Hook Form resolver

---

## Mapper (Optional)

Create only when data models differ.

Responsibilities

- Form Model → Request DTO
- Response DTO → Application Model
- Application Model → Request DTO

Never

- Call APIs
- Validate
- Use React
- Perform business workflow

If mapping is very small, keep it inside the service.

---

## Selector

Pure derived-data layer.

Responsibilities

- Filter
- Sort
- Group
- Aggregate
- Dashboard calculations
- DataGrid rows
- View model generation

Examples

- getFilteredTransactions()
- getTransactionRows()
- getTransactionInsights()

Selectors must be PURE.

Never

- Call APIs
- Mutate data
- Update state
- Show notifications

---

## Types

Keep only shared contracts.

Examples

```ts
Transaction;

CreateTransactionDto;

UpdateTransactionDto;

TransactionFilter;

TransactionRow;

TransactionInsights;
```

Keep implementation-specific interfaces beside the file that owns them.

---

# State Management

There are three kinds of state.

## 1. Local UI State

Owner

React

Library

useState

Examples

- Dialog open
- Drawer open
- Search text
- Pagination
- Selected row
- Current tab

---

## 2. Server State

Owner

TanStack React Query

Examples

- Transactions
- Accounts
- Goals
- Investments
- Categories

Never duplicate server state inside Zustand.

---

## 3. Global Application State

Owner

Zustand

Examples

- Logged user
- JWT token
- Theme
- Sidebar state
- Notifications
- Language
- Workspace

---

# Data Models

## Form Model

Used by React Hook Form.

Example

```text
TransactionFormValues
```

---

## Request DTO

Used to communicate with the backend.

Example

```text
CreateTransactionDto
```

---

## Response DTO

Represents backend response.

Example

```text
TransactionResponseDto
```

---

## Application Model

Used across the frontend.

Example

```text
Transaction
```

---

## View Model

Derived specifically for rendering.

Usually produced by selectors.

Example

```text
TransactionRow

DashboardSummary
```

---

# Data Flow

Request

```text
Form
    │
    ▼
Request DTO
    │
    ▼
API
    │
    ▼
Backend
```

Response

```text
Backend
    │
    ▼
Response DTO
    │
    ▼
Application Model
    │
    ▼
Selector
    │
    ▼
View Model
    │
    ▼
UI
```

If Request DTO and Application Model are identical, do not create separate DTOs.

---

# Naming Convention

| Item           | Convention |
| -------------- | ---------- |
| Folder         | kebab-case |
| Components     | PascalCase |
| Component File | PascalCase |
| Hook File      | kebab-case |
| API            | kebab-case |
| Service        | kebab-case |
| Selector       | kebab-case |
| Schema         | kebab-case |
| Mapper         | kebab-case |
| Types          | kebab-case |
| Variables      | camelCase  |
| Functions      | camelCase  |
| Interfaces     | PascalCase |
| Types          | PascalCase |
| Enums          | PascalCase |

---

# Decision Matrix

## Should I create a Service?

YES

- Business rules
- Validation
- Mapping
- Multiple APIs
- Workflow

NO

- Just forwarding an API call

---

## Should I create a Mapper?

YES

- API model differs from frontend model
- Request DTO differs from Form Model
- Response DTO differs from Application Model

NO

- Models are identical

---

## Should I create a Selector?

YES

- Filter
- Sort
- Group
- Aggregate
- Build UI rows
- Dashboard calculations

NO

- API communication
- Validation
- Business workflow

---

## Should I use Zustand?

YES

- Global application state

NO

- Server data

Use React Query instead.

---

## Should I use useState?

YES

- Component-only state

NO

- Shared application state

---

# Golden Rules

1. Components never call APIs.
2. Hooks own TanStack React Query.
3. API owns HTTP communication.
4. Service exists only when it adds business value.
5. Selectors derive UI data.
6. Validation belongs in schemas.
7. Keep architecture simple.
8. Introduce new layers only when they own a responsibility.
9. React Query owns server state.
10. Zustand owns application state.
11. useState owns component state.
12. Architecture should evolve with complexity, not anticipate it.
