# Finance Tracker - Architecture Blueprint

## Vision

Build a modern finance management application with a **workspace +
drawer** UX similar to Notion, Linear and Jira.

Core principles:

-   SPA first (no routing initially)
-   Drawer-first interactions
-   Dialogs for confirmations and quick actions
-   Reusable component library
-   Module-based architecture
-   Backend-agnostic repository pattern

------------------------------------------------------------------------

# Technology Stack

## Frontend

-   React 19
-   Vite
-   TypeScript
-   Material UI
-   Tailwind CSS
-   Zustand
-   TanStack Query
-   React Hook Form
-   Zod
-   Axios
-   Recharts

## Backend

-   NestJS
-   Repository Pattern
-   Supabase (initial)
-   Firebase / Mock (future)

------------------------------------------------------------------------

# SPA Navigation

No routing initially.

``` text
App
 └── Layout
      ├── Sidebar
      ├── Header
      └── ActiveScreen
```

Example Zustand state:

``` ts
type Screen =
  | "dashboard"
  | "transactions"
  | "accounts"
  | "budgets"
  | "goals"
  | "categories"
  | "reports"
  | "cards"
  | "reminders"
  | "settings";
```

------------------------------------------------------------------------

# Screen Pattern

Every module follows:

``` text
Page Header
KPI Cards
Search / Filter / Sort
Primary Content
Secondary Analytics
```

------------------------------------------------------------------------

# Dashboard Philosophy

Dashboard is NOT a CRUD page.

Purpose:

-   Financial Health
-   Recent Activity
-   Navigation
-   Actionable Insights

Sections:

-   KPI Cards
-   Cash Flow
-   Expense Breakdown
-   Goal Snapshot
-   Budget Snapshot
-   Account Snapshot
-   Recent Transactions
-   Upcoming Reminders
-   Insights
-   Quick Actions

No Edit/Delete buttons on dashboard cards.

------------------------------------------------------------------------

# Drawer Pattern

Modules:

-   Goals
-   Transactions
-   Accounts
-   Budgets
-   Categories

Use the same interaction model.

``` text
List/Card
    ↓
View Drawer
    ↓
Edit (same drawer)
    ↓
Save
```

Dialogs are only for:

-   Delete confirmation
-   Add Contribution
-   Transfer Money
-   Import
-   Quick actions

------------------------------------------------------------------------

# Goal Flow

Dashboard → Goal Card → Goal Details Drawer → Edit (same drawer) → Add
Contribution (dialog) → Delete (confirm dialog)

Goals Menu → Goal List → Goal Details Drawer → Edit (same drawer)

------------------------------------------------------------------------

# Project Structure

``` text
src/
  app/
  layout/
  modules/
  components/
    common/
    drawers/
    dialogs/
    charts/
  services/
  store/
  hooks/
  theme/
  utils/
  types/
```

------------------------------------------------------------------------

# Shared Components

-   AppLayout
-   Sidebar
-   Header
-   PageHeader
-   KpiCard
-   SectionCard
-   DataTable
-   SearchBar
-   FilterBar
-   Drawer
-   ConfirmDialog
-   ProgressBar
-   StatusChip
-   EmptyState

------------------------------------------------------------------------

# Zustand Stores

-   appStore (active screen)
-   drawerStore
-   authStore
-   themeStore
-   notificationStore

------------------------------------------------------------------------

# Development Roadmap

1.  Folder structure
2.  Theme
3.  Shared components
4.  SPA navigation
5.  Dashboard
6.  Goals module
7.  Transactions
8.  Accounts
9.  Budgets
10. Categories
11. Reports
12. Backend integration

------------------------------------------------------------------------

# Future

Later introduce React Router without changing UX.

``` text
Now:
Dashboard
 └── Drawer

Future:
Route
 └── Drawer
```

------------------------------------------------------------------------

# Premium Finance SaaS Layer

This application should not feel like a basic CRUD finance tracker. It
should feel like a premium finance SaaS product that helps users
understand their financial health.

## Financial Health Score

Add a calculated dashboard score that summarizes the user's current
financial condition.

Example:

``` text
Financial Health Score

82 / 100

Healthy

You're saving 42% of your income.
You're 12% ahead of last month.
One budget needs attention.
Two goals are on track.
```

## Score Inputs

The score can be calculated from:

-   Savings rate
-   Budget utilization
-   Expense trend
-   Goal progress
-   Emergency fund progress
-   Upcoming bills
-   Account balance trend
-   Overspending frequency

## Smart Insights

Smart insights are calculated messages, not AI-generated messages.

Examples:

``` text
Food expenses increased 18% compared to last month.

Emergency Fund can be completed 2 months earlier.

You've stayed under budget for 5 consecutive months.

Transport spending is 12% lower than your monthly average.

You are 75% toward your Europe Trip goal.
```

## Dashboard Placement

Smart insights should appear on the dashboard as a dedicated section.

``` text
Dashboard
  KPI Cards
  Cash Flow
  Financial Health Score
  Smart Insights
  Goal Snapshot
  Budget Snapshot
  Account Snapshot
  Recent Transactions
```

## Insight Types

-   Positive insights
-   Warning insights
-   Opportunity insights
-   Goal progress insights
-   Budget risk insights
-   Spending trend insights

## Design Principle

The user should not feel like they are only entering and editing
records.

They should feel like the app is answering:

-   Am I financially healthy?
-   What changed this month?
-   What needs attention?
-   What am I doing well?
-   What should I review next?

------------------------------------------------------------------------

# Navigation Strategy (Final Decision)

## Phase 1 --- Single Page Application (Current)

The application will start as a Single Page Application (SPA) without
React Router.

Navigation is controlled by a centralized Zustand store.

``` text
App
 └── AppLayout
      ├── Sidebar
      ├── Header
      └── ActiveScreen
```

Example screen state:

``` ts
type Screen =
  | "dashboard"
  | "transactions"
  | "accounts"
  | "budgets"
  | "goals"
  | "categories"
  | "reports"
  | "cards"
  | "reminders"
  | "settings";
```

The sidebar changes only the active workspace.

Details are **never separate pages**. They open in reusable Drawers.

Create/Edit happens inside the same Drawer.

Delete and quick actions use Dialogs.

## Navigation Abstraction

Avoid calling `setActiveScreen()` throughout the application.

Instead, use a navigation service:

``` ts
navigateTo("goals");
```

Today:

``` ts
navigateTo("goals") -> setActiveScreen("goals")
```

Future:

``` ts
navigateTo("goals") -> navigate("/goals")
```

This isolates the navigation implementation and keeps migration simple.

## Phase 2 --- Future React Router

If deep-linking, browser history, or shareable URLs become important,
introduce React Router **without changing the UX**.

Routes will represent only workspaces:

-   /dashboard
-   /transactions
-   /accounts
-   /goals
-   /budgets
-   /categories
-   /reports
-   /settings

Drawers remain unchanged and continue to provide entity details.

------------------------------------------------------------------------

# UI State Contract

The app starts as an SPA, so all navigation and interaction state should
be explicit and predictable.

## App Screen State

``` ts
type Screen =
  | "dashboard"
  | "transactions"
  | "accounts"
  | "budgets"
  | "goals"
  | "categories"
  | "reports"
  | "cards"
  | "reminders"
  | "settings";

type AppState = {
  activeScreen: Screen;
};
```

## Drawer State

Drawers are used for entity details, create flows, and edit flows.

``` ts
type DrawerType =
  | "goal"
  | "transaction"
  | "account"
  | "budget"
  | "category"
  | "card"
  | "reminder"
  | null;

type DrawerMode = "view" | "create" | "edit" | "review" | null;

type DrawerStep =
  | "overview"
  | "details"
  | "form"
  | "review"
  | "success"
  | null;

type DrawerState = {
  open: boolean;
  type: DrawerType;
  mode: DrawerMode;
  entityId?: string;
  step?: DrawerStep;
};
```

## Dialog State

Dialogs are used for short-lived actions only.

Examples:

-   Delete confirmation
-   Add contribution
-   Transfer money
-   Mark as paid
-   Import confirmation

``` ts
type DialogType =
  | "confirmDelete"
  | "addContribution"
  | "transferMoney"
  | "markPaid"
  | "importCsv"
  | null;

type DialogState = {
  open: boolean;
  type: DialogType;
  payload?: unknown;
};
```

## View State

Each module owns its own filters, sorting, pagination, and selection.

``` ts
type SortDirection = "asc" | "desc";

type ViewState<TFilters = Record<string, unknown>> = {
  filters: TFilters;
  sort: {
    field: string;
    direction: SortDirection;
  };
  pagination: {
    page: number;
    pageSize: number;
  };
  selectedIds: string[];
};
```

## State Ownership Rule

``` text
activeScreen
  → appStore

drawer
  → drawerStore

dialog
  → dialogStore

viewState
  → module store or local screen state

server data
  → TanStack Query

form state
  → React Hook Form
```

Do not store API lists, form fields, or server responses in Zustand
unless there is a specific reason.

------------------------------------------------------------------------

# Action Contract

Every meaningful user action should follow the same flow.

``` text
intent
  → precheck
  → execute
  → feedback
  → rollback
```

## Contract Definition

``` ts
type ActionContract<TPayload = unknown> = {
  intent: string;
  payload?: TPayload;
  precheck?: () => boolean | Promise<boolean>;
  execute: () => Promise<void>;
  feedback?: {
    success?: string;
    error?: string;
    loading?: string;
  };
  rollback?: () => void | Promise<void>;
};
```

## Example: Delete Goal

``` text
intent:
  User wants to delete a goal.

precheck:
  Confirm the goal exists.
  Confirm user accepted delete dialog.

execute:
  Call delete goal API or mock repository.

feedback:
  Show success toast.
  Refresh goals query.
  Close drawer and dialog.

rollback:
  Restore optimistic UI if delete failed.
```

## Example: Add Contribution

``` text
intent:
  User wants to add money toward a goal.

precheck:
  Amount must be greater than zero.
  Goal must be active.

execute:
  Create contribution record.
  Update goal progress.

feedback:
  Show success toast.
  Refresh goal details and dashboard snapshot.

rollback:
  Revert optimistic progress update if API fails.
```

## Action Design Rule

Actions should not be hidden inside UI components.

Prefer this pattern:

``` text
UI Component
  → calls module action/hook
  → action performs precheck/execute/feedback
  → UI reacts to state changes
```

------------------------------------------------------------------------

# SPA Module Rollout Order

Since the first version is SPA-only, modules should be built in an order
that proves the architecture early.

## 1. Goals --- Reference Module

Build Goals first because it contains the full interaction pattern:

-   List/cards
-   KPI cards
-   Search/filter/sort
-   Details drawer
-   Create drawer
-   Edit drawer mode
-   Add contribution dialog
-   Delete confirmation dialog
-   Progress analytics
-   Dashboard snapshot integration

Goals becomes the reference implementation for every other module.

## 2. Transactions

Build Transactions second because it is the core financial activity
module.

It should reuse:

-   Page header
-   KPI cards
-   Filter bar
-   Table/list
-   Details drawer
-   Create/edit drawer
-   Delete dialog
-   Category/account selectors
-   TanStack Query mutation flow

## 3. Categories

Build Categories third because Transactions depend on Categories.

It should establish the master-data pattern:

-   Category list/table
-   Income/expense grouping
-   Add/edit drawer
-   Archive/delete dialog
-   Top spending analytics
-   Used/unused category insights

## 4. Accounts

Build Accounts after Categories and Transactions.

Accounts should introduce:

-   Account cards
-   Account details drawer
-   Transfer dialog
-   Balance summary
-   Linked transaction preview

## 5. Budgets

Build Budgets after Transactions and Categories.

Budgets depend on category spending and transaction totals.

## 6. Dashboard

Build the full Dashboard after Goals, Transactions, Categories,
Accounts, and Budgets have stable mock data.

Dashboard should consume module snapshots instead of owning business
logic.

## 7. Reports

Build Reports after the core data modules are stable.

Reports should be analytics-focused, not CRUD-focused.

## 8. Settings

Build Settings last unless authentication/preferences are needed
earlier.

Settings should follow a tabbed form layout.
