---
name: test-case-writing
description: "Write, review, and validate executable client, server unit, and API contract tests for JavaScript/TypeScript financial applications. Use for React components, hooks, Vitest, Testing Library, Zustand, Node/NestJS services, controllers, repositories, Prisma boundaries, HTTP API contracts, coverage gaps, financial invariants, colocated test files, and test-quality reviews. Generate code by default rather than stopping at a test plan."
---

# Test Case Writing

## Purpose

Create trustworthy, maintainable, executable tests for client and server code.

Optimize for **business and user confidence**, not test count, line count, or coverage percentage.

Generate the smallest non-duplicative test set that protects every distinct applicable business/user contract.

Protect behavior deeply at the layer that owns it. At higher layers, test only the distinct wiring, integration, or public contract owned by that layer.

Do not add tests merely because a line, branch, condition, prop, input value, or implementation detail exists.

## Mandatory Deliverable

Unless the user explicitly asks only for analysis, review, or a test plan, produce executable test code.

Do not stop after a coverage matrix, branch inventory, recommendations, pseudocode, smoke test, or happy-path test.

For every requested subject:

1. Inspect the implementation, types, dependencies, neighboring tests, fixtures, and relevant setup.
2. Identify the owning public subject and correct test type.
3. Identify meaningful business/user contracts and distinct behavior paths.
4. Build a behavior inventory before editing complex subjects.
5. Remove duplicate/equivalent cases using equivalence classes where appropriate.
6. Map every applicable inventory item to an executable test or explicit justified status.
7. Create or update the correctly colocated test file.
8. Finish the complete planned test implementation for ALL files requested in the task.
9. Only then run the focused tests covering the changed test files.
10. Repair failures caused by test defects and rerun after those fixes.
11. Reconcile implemented tests against the inventory and report residual blockers or production defects.

Minimize duplication, not meaningful coverage.

"Focused" and "maintainable" do not permit omitting distinct business rules, meaningful negative paths, boundaries, state transitions, failures, or user workflows.

## Test Ownership

Protect each contract at the layer that owns it.

- Client tests protect business presentation, client validation, user workflows, shared client state, and client-side orchestration.
- Server unit tests protect backend business rules, financial calculations, domain invariants, authorization decisions, state transitions, and service/repository behavior.
- API contract tests protect the externally observable HTTP boundary: routing, authentication, guards, request validation, status/error mapping, and serialization.

Do not repeat a lower layer's complete test matrix at higher layers.

For example, if server unit tests deeply prove a financial boundary, API tests should verify the relevant domain error is exposed through the correct HTTP contract rather than repeating every financial permutation.

## Strict Test Organization

Read `references/test-style.md` before editing and follow it as the authority for `describe` / `it` organization and naming.

The diagnostic hierarchy is:

```text
<Subject> > <Method/Function> > <Use Case>
```

General rules:

- Use exactly one root `describe` for the primary subject of the test file.
- Class/service/controller/repository: root `describe` uses the exact class name.
- React component: root `describe` uses the exact component name.
- React hook: root `describe` uses the exact hook name.
- File containing multiple exported functions: root `describe` uses the implementation basename.
- File containing one primary exported function: root `describe` uses the exact function name.
- For classes/services/modules containing multiple methods/functions, nested `describe` blocks use only the exact method/function name.
- Do not repeat a single primary function in both root and nested `describe`.
- Do not create category `describe` blocks such as loading, success, errors, validation, happy path, edge cases, rendering, or interactions.
- `it` describes only the use case and observable expected behavior.
- Do not repeat parent subject/method names unnecessarily in `it`.

For API contract tests:

```text
<API Resource> > <HTTP METHOD + Route> > <Use Case>
```

Example:

```ts
describe('Investments API', () => {
  describe('POST /investments', () => {
    it('creates an investment from a valid request', () => {});
    it('rejects an unauthenticated request', () => {});
  });
});
```

Do not create additional API grouping levels for status codes, authentication, validation, success, or errors. Those scenarios belong in `it`.

If neighboring tests conflict with this organization rule, this rule wins unless the user explicitly asks to preserve the neighboring style.

## File Naming And Placement

Keep tests colocated with the feature and implementation they protect.

### Client

Preserve the exact implementation basename:

```text
Thing.tsx        -> Thing.test.tsx
thing.ts         -> thing.test.ts
thing.api.ts     -> thing.api.test.ts
thing.schema.ts  -> thing.schema.test.ts
```

### Server Unit

Keep unit tests beside the implementation:

```text
thing.service.ts     -> thing.service.test.ts
thing.repository.ts  -> thing.repository.test.ts
thing.guard.ts       -> thing.guard.test.ts
```

Do not add `.unit` to filenames unless the repository already requires it.

### Server API Contract

Keep feature-owned API contract tests colocated with the owning feature:

```text
src/investments/
├── investments.controller.ts
├── investments.service.ts
├── investments.service.test.ts
└── investments.api.test.ts
```

Use:

```text
<feature>.api.test.ts
```

for HTTP API contract tests.

API contract tests do not need to preserve a controller basename because their subject is the feature's HTTP contract, not the controller implementation.

Do not create a generic centralized API-test directory when the API contract has clear feature ownership.

True cross-feature/system E2E journeys may use a dedicated repository E2E location when such a test boundary exists.

### General Placement Rules

- Preserve implementation directory and feature ownership.
- Do not create generic `tests/`, `misc.test.*`, or combined cross-feature files when a test has clear feature ownership.
- One unit-test file has one clear implementation subject/file boundary.
- One API-contract file has one clear API feature/resource boundary.
- Keep feature-specific fixtures and mocks local.
- Put reusable helpers only in the repository's established shared test-helper location.

## Coverage Workflow

Select cases from business/user behavior and distinct implementation paths, not percentage targets.

Do not attempt meaningless Cartesian-product coverage.

Before adding a test, ask:

1. What business, user, domain, or public contract does this protect?
2. Is this meaningfully different behavior or a distinct failure mode?
3. Is the same contract already protected by another test?

If there is no meaningful contract, do not add the test.

If another test already protects the same contract, do not duplicate it.

Use equivalence classes when multiple inputs exercise the same rule and outcome.

For complex UI, inventory meaningful conditional business presentation, loading/error/empty/populated/filtered states, user controls, navigation callbacks, dialogs/drawers, shared-state workflows, and applicable mutation states.

Do not test presentation-only conditions unless they materially affect what the user can understand, decide, or do.

A child test does not replace important parent wiring coverage.

For functions and server code, inventory public inputs, outputs, domain decisions, thrown/mapped errors, meaningful boundaries, state changes, authorization, persistence behavior, and domain invariants.

Every applicable inventory item must finish as one of:

- `IMPLEMENTED` — executable test exists.
- `COVERED_BY` — name the test that protects the identical contract.
- `NOT_APPLICABLE` — explain why.
- `BLOCKED` — state the concrete blocker.

`TODO`, `recommended`, `future test`, `could test`, and `coverage opportunity` are not acceptable final statuses when enough repository information exists to implement the test.

## Client Tests

For React/Vitest/Testing Library/Zustand work, read `references/react-vitest.md` before editing.

Use the repository's existing Vitest/jsdom/setup configuration and established test utilities.

Protect client-owned behavior such as:

- business information presented to the user;
- forms and client validation;
- meaningful UI states;
- permissions/action availability;
- user workflows;
- API orchestration;
- mutation/recovery behavior;
- Zustand state transitions;
- important cross-component Zustand workflows;
- chart transformation and drill-down context.

Prefer accessible queries and `userEvent`.

Mock external boundaries rather than private component implementation.

Render application-owned child components by default when doing so provides useful wiring confidence; mock them selectively when their internals are irrelevant or unnecessarily expensive/unstable.

Isolate React Query clients, Zustand stores, session/local storage, mocks, timers, dates, and other mutable state between tests.

Do not retest backend-owned financial calculations in the client. Test that backend-provided financial information is displayed, labeled, associated, and used with the correct business context.

## Server Unit Tests

For Node/NestJS/service/controller/repository/Prisma unit-test work, read `references/server-unit-tests.md` before editing.

Server unit tests should carry the depth of backend business-rule testing.

Choose the narrowest boundary that owns the behavior.

Protect applicable:

- business rules and financial invariants;
- backend financial calculations;
- authorization/ownership decisions;
- state transitions;
- service orchestration;
- duplicate/idempotency behavior;
- meaningful boundaries;
- domain errors;
- transaction/rollback behavior;
- application-owned repository/query/mapping behavior.

Mock external boundaries for ordinary unit tests.

Do not test NestJS, Prisma, JavaScript, or TypeScript framework/language behavior.

Do not create controller unit tests by default when a controller only delegates to a service. Use service unit tests for business behavior and API contract tests for HTTP wiring.

Do not require a live database unless explicitly requested or the repository has an established integration-test boundary requiring one.

## API Contract Tests

For HTTP/API contract work, read `references/api-tests.md` before editing.

Prefer real HTTP-level tests through the configured Nest/application test server when the repository supports it.

API tests protect applicable:

- HTTP method and route;
- path/query parameters;
- authentication;
- authorization and guards;
- DTO/request validation and transformation;
- successful public response;
- status codes;
- response serialization;
- domain-error to HTTP-error mapping;
- meaningful not-found/conflict contracts;
- relevant middleware/interceptor behavior.

Test only contracts actually supported by the endpoint.

Do not mechanically generate every possible `400`, `401`, `403`, `404`, `409`, `422`, or `500` case.

Do not repeat detailed business-rule or financial permutations already protected by server unit tests.

An API test should remain valid when internal implementation changes but the external HTTP contract remains unchanged.

Do not turn every API contract test into a full end-to-end or database integration test.

## Financial Domain

For financial calculations, balances, transactions, currencies, dates, authorization, or persistence of financial state, read `references/financial-testing.md` and apply every relevant invariant.

Test financial rules at the layer that owns them.

Never change expected values merely to make a failing test pass. First establish whether the domain expectation or production implementation is wrong.

## Mandatory Test Execution Timing

Test generation and execution are separate phases.

### Generation Phase

For all files requested in the current task:

1. Inspect and inventory.
2. Write the complete planned test code.
3. Finish all planned `describe` blocks and test cases across all requested files.

During this phase:

- Do NOT run tests after each `it` / `test`.
- Do NOT run tests after each `describe`.
- Do NOT run tests after each file edit.
- Do NOT repeatedly execute tests while the requested suite is still being generated.

### Validation Phase

After test code is complete for ALL requested files:

1. Run the narrowest configured command covering all changed/requested test files.
2. Review all failures together.
3. Classify each failure as a test defect, production defect, environment/configuration issue, or incorrect expectation.
4. Fix test defects together.
5. Rerun the focused tests after fixes.
6. Repeat only when a validation run exposed failures requiring changes.

Do not rerun an already-passing focused suite without a concrete reason.

A test-writing task is not complete until generated tests have been executed at least once, unless execution is technically blocked.

If blocked:

- do not claim tests passed;
- report the exact intended command;
- report the blocker;
- state that the tests remain unvalidated.

Inspect `package.json`, Vitest configuration, workspace configuration, and neighboring tests before choosing commands.

Use the repository's configured runner and scripts. Never invent a test command, introduce a second test framework, or silently require a live backend/database.

Run type-checking after focused tests only when relevant and available.

Do not run build, watch, dev-build, broad lint/format, live-server, migration, or database commands unless explicitly requested.

## Reporting

Report concisely:

- files created or changed;
- business/user/public contracts covered;
- meaningful states, boundaries, and failure/recovery behavior covered;
- focused commands run and results;
- production defects discovered;
- intentionally omitted duplicate/low-value cases when relevant;
- inventory reconciliation;
- genuine residual gaps or blockers.

Do not use test count or coverage percentage alone as evidence of test quality.

The target is **complete protection of distinct business and user contracts with the smallest maintainable, non-duplicative test suite**.