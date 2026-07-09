# Finance Tracker - Architecture (Single Source of Truth)

## Purpose
Build a premium finance workspace, not a CRUD application.

## Product Principles
- Workspace-first
- Drawer-first
- Dashboard-first
- Insight-driven
- Reusable components over page-specific code

## Tech Stack
Frontend:
- React 19
- Vite
- TypeScript
- MUI
- Tailwind CSS
- Zustand
- TanStack Query
- React Hook Form
- Zod
- Axios
- Recharts

Backend:
- NestJS
- Repository Pattern
- Supabase (initial)
- Firebase / Mock (future)

## Workspace Model (SPA)

Only one workspace is active.

Dashboard
Transactions
Accounts
Goals
Budgets
Categories
Reports
Settings

Navigation is managed by Zustand using activeWorkspace.

## Interaction Rules

Workspace
 -> Drawer
    -> Edit (same drawer)
    -> Dialog (confirmation / quick action)

Dashboard never exposes CRUD.

## Dashboard

Purpose:
- Financial Health
- Smart Insights
- Cash Flow
- Goal Snapshot
- Budget Snapshot
- Account Snapshot
- Recent Transactions
- Reminders

Financial Health Score and Smart Insights are calculated, not AI.

## Workspace Template

Page Header
KPI Cards
Toolbar (Search / Filter / Sort)
Primary Content
Secondary Analytics

## UI State Contract

activeWorkspace

drawer:
- type
- mode
- entityId
- step

dialog:
- type
- payload

viewState:
- filters
- sort
- pagination
- selectedIds

State ownership:
- Zustand -> UI state
- TanStack Query -> server state
- React Hook Form -> form state
- Zod -> validation

## Action Contract

Intent
 -> Precheck
 -> Execute
 -> Feedback
 -> Rollback

## Shared Components

AppLayout
Sidebar
Header
PageHeader
KpiCard
SectionCard
ChartCard
DataTable
SearchBar
FilterBar
RightDrawer
ConfirmDialog
ProgressBar
InsightCard
FinancialHealthCard

## Folder Structure

src/
  app/
  layout/
  modules/
  shared/
  services/
  store/
  hooks/
  theme/
  utils/
  types/

## Module Build Order

1. Foundation
2. Shared Components
3. Dashboard
4. Goals (reference module)
5. Transactions
6. Categories
7. Accounts
8. Budgets
9. Reports
10. Settings
11. Backend Integration

