# My Financial

My Financial is a full-stack personal finance application for bringing everyday money management and long-term financial products into one place.

It helps a user:

- track income, expenses, transfers, and financial accounts;
- organize financial goals and spending categories;
- track investments, policies, contributions, premiums, valuations, and future benefits;
- distinguish cash movement from investment activity and observed valuation;
- view portfolio, expense, cashflow, and net-worth data from a consistent financial model.

The repository contains the React client, NestJS server, Prisma/PostgreSQL persistence layer, mock provider, and technical documentation for the system.

## Project Status

The current repository is an active engineering codebase with a defined client/server architecture. The technical documentation describes the implementation that exists today and the conventions new code should follow.

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

- [Technical documentation index](docs/INDEX.md)
- [Technical architecture](docs/ARCHITECTURE.md)
- [Data model and schema guide](docs/DATA_MODEL_AND_SCHEMA.md)
- [Technical diagrams](docs/reference/diagrams/)
- [ER diagram](docs/reference/er-diagrams/INVESTMENT_ER_DIAGRAM.md)

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
    INDEX.md
    ARCHITECTURE.md
    DATA_MODEL_AND_SCHEMA.md
    reference/
      diagrams/
      er-diagrams/
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

## User Preferences

Settings saves light/dark theme, symbol/code currency display, and date format per
authenticated user. Save applies the server response; Cancel discards the local draft. Login and
session startup load saved preferences, including when a user profile is cached.
The header theme shortcut saves immediately through the same persistence path.
Theme changes apply after successful saves, and failed saves preserve the previous
appearance. Settings and the header share a save lock to prevent overlapping writes.

For an existing PostgreSQL/Supabase database:

1. If currency preferences have not been installed, apply
  `server/prisma/sql/add_user_preferences.sql` once.
2. Apply `server/prisma/sql/add_theme_preferences.sql` once. It adds `themeMode`
  with a light default for existing rows.
3. Apply `server/prisma/sql/add_user_preferences_timestamps.sql` once to add
  creation and last-update timestamps. Existing rows receive the upgrade time;
  their original creation and update times were not recorded.
4. Apply `server/prisma/sql/add_date_format_preferences.sql` once to add
  `dateFormat`, defaulting existing rows to `DD_MM_YYYY` (`DD/MM/YYYY`).
5. Regenerate Prisma bindings with `npm run prisma:generate` in server before
  deploying the updated server.

Fresh databases include all preference fields in `server/prisma/sql/core_schema.sql`
and do not need these upgrade scripts. No upgrade changes monetary records. Mock
mode stores preferences in memory for the server process lifetime, like the other
mock data. Browser `app-theme-mode` values are no longer read or imported; the
anonymous/logged-out theme is light.

Persisted preferences include timezone-aware `createdAt` and `updatedAt` fields;
Prisma maintains `updatedAt` on writes. Direct SQL updates must set it explicitly.
These timestamps are persistence metadata and are not included in preference API responses.

- `GET /api/users/me/preferences` returns resolved preferences.
- `PATCH /api/users/me/preferences` accepts `currencyDisplay` (`symbol` or `code`),
  `themeMode` (`light` or `dark`), and/or `dateFormat`, updates only supplied fields, and returns
  the complete saved object.
- Login/register responses include `preferences`; `/api/auth/me` includes it
  alongside the public profile.

Supported date format values:

| API Value | Display Pattern | Example |
| --- | --- | --- |
| `DD_MM_YYYY` (default) | `DD/MM/YYYY` | `30/10/2026` |
| `MM_DD_YYYY` | `MM/DD/YYYY` | `10/30/2026` |
| `YYYY_MM_DD` | `YYYY-MM-DD` | `2026-10-30` |
| `DD_MMM_YYYY` | `DD MMM YYYY` | `30 Oct 2026` |

Date format applies to full-date displays and MUI date-picker inputs after saving.
English month names, relative labels, and compact month/year chart labels remain
unchanged. Date-only strings are displayed as calendar dates without UTC conversion;
timestamps retain local-time display. API serialization, stored financial dates,
sorting, filters, and recurring schedules are unchanged. This is not a timezone or
language preference.

These preferences change presentation only. They do not choose a default currency,
convert amounts, or add language/region settings. Record currency is retained where
available; currency-less displays keep their existing INR context. Existing
mixed-currency home-dashboard aggregation limitations remain a separate financial
correctness task.

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
