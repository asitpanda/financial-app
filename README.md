# My Financial

Full-stack personal finance platform with a frozen architecture for client and server.

## Current Architecture Status

- Client architecture: frozen
- Server architecture: frozen
- Provider strategy: frozen (`mock | postgres | supabase`)
- Repository naming and layering: frozen

## Tech Stack

### Client

- React 19 + TypeScript
- TanStack Query
- Zustand
- MUI + Tailwind
- React Hook Form + Zod

### Server

- NestJS + TypeScript
- Prisma ORM
- PostgreSQL
- JWT auth
- Swagger

## Provider Modes

`DB_PROVIDER` supports:

- `mock`: returns data from mock adapters
- `postgres`: uses Prisma adapters against PostgreSQL
- `supabase`: also uses Prisma adapters (database-backed path)

Provider normalization and binding live in server/src/database/db-provider.ts.

## Backend Data Access Pattern

```text
Controller
  -> Service
    -> Stable Repository (<feature>.repository.ts)
      -> DataSource Port (<feature>.datasource.port.ts)
        -> Prisma Adapter (<feature>.prisma.repository.ts)
        -> Mock Adapter (<feature>.mock.repository.ts)
```

Provider selection happens at module DI binding time, not inside services.

## Documentation Map

- Handoff bundle by audience: docs/HANDOFF_BUNDLE.md
- Frozen architecture: docs/ARCHITECTURE.md
- Data model and schema guide: docs/DATA_MODEL_AND_SCHEMA.md
- Backend folder structure: docs/BACKEND_FOLDER_STRUCTURE.md
- ER diagram: docs/data-model/INVESTMENT_ER_DIAGRAM.md
- Frontend architecture guidelines: ARCHITECTURE.md

### Recent Schema/Behavior Updates

- `investment_asset_taxonomy` is now user-owned (`userId` FK) and all read/write paths are tenant scoped.
- Recurring investment scheduler model is part of canonical schema (`investment_contribution_plans` + recurring metadata in `investment_events`).
- Baseline schema SQL and alter SQL are both updated in `server/prisma/sql/`.

## Project Structure

```text
my-financial/
  client/
    src/
      features/
      components/
      store/
      api/
  server/
    src/
      auth/
      categories/
      financial-accounts/
      goals/
      transactions/
      investments/
      investment-asset-taxonomy/
      investment-events/
      investment-contribution-plans/
      valuation-snapshots/
      database/
      common/
      domain/
      mockdata/
    prisma/
      schema.prisma
  docs/
    ARCHITECTURE.md
    DATA_MODEL_AND_SCHEMA.md
    BACKEND_FOLDER_STRUCTURE.md
    data-model/
      INVESTMENT_ER_DIAGRAM.md
```

## Quick Start

### 1) Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2) Configure environment

Create server `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/myfinancial"
DB_PROVIDER="mock"
JWT_SECRET="change-me"
JWT_EXPIRES_IN="7d"
PORT=5000
FRONTEND_URL="http://localhost:3000"
```

Create client `.env`:

```env
REACT_APP_API_URL=http://localhost:5000
```

### 3) Run server and client

Server:

```bash
cd server
npm run prisma:generate
npm run start:dev
```

Client:

```bash
cd client
npm start
```

## Backend Scripts

From server:

- `npm run build`
- `npm run start:dev`
- `npm run prisma:generate`
- `npm run prisma:push`
- `npm run prisma:migrate`
- `npm run prisma:studio`

## Runtime Logging And Error Contract

- Request/response logging with `x-request-id` is configured globally.
- Validation errors are flattened with `field` + `details` payload.
- Prisma and HTTP exceptions are normalized by a global exception filter.
- Set `LOG_FORMAT=json` for JSON log output.

## API Docs

Swagger is available at:

- http://localhost:5000/api/docs

## Notes

- `mock` mode must remain non-breaking and shape-compatible with DB-backed modes.
- `postgres` and `supabase` intentionally share the same Prisma-backed adapter path.
