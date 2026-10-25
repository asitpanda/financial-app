---
name: test-case-writing
description: "Write, review, and validate executable client and server unit tests for JavaScript/TypeScript financial applications. Use for React components, hooks, Vitest, Testing Library, Node/NestJS services, controllers, repositories, Prisma boundaries, API behavior, coverage gaps, financial invariants, colocated test files, and test-quality reviews. Generate code by default rather than stopping at a test plan."
---

# Test Case Writing

## Purpose

Create trustworthy, maintainable, executable tests for client and server code. Treat tests as specifications for observable behavior, public contracts, persistence boundaries, authorization, and financial correctness.

## Mandatory Deliverable

Unless the user explicitly asks only for analysis, review, or a test plan, produce executable test code.

Do not stop after a coverage matrix, branch inventory, recommendations, pseudocode, smoke test, or happy-path test.

For every requested subject:
1. Inspect the implementation, types, dependencies, neighboring tests, fixtures, and relevant setup.
2. Identify the owning public subject and correct test type.
3. Build a behavior/branch inventory before editing complex subjects.
4. Map every applicable inventory item to an executable test or an explicit justified status.
5. Create or update the correctly colocated test file.
6. Finish the complete planned test implementation for ALL files requested in the task.
7. Only then run the focused tests covering the changed test files.
8. Repair failures caused by test defects and rerun after those fixes.
9. Reconcile implemented tests against the inventory and report residual blockers or production defects.

Minimize duplication, not coverage. "Focused" and "maintainable" do not permit omitting meaningful negative paths, boundaries, alternate render states, mutation failures, or user interactions.

## Strict Test Organization

Use one top-level `describe` per public subject. Read `references/test-style.md` and follow it as a strict style contract.

- Exported function: one `describe('functionName')`.
- React component: one `describe('ComponentName')`.
- React hook: one `describe('useHookName')`.
- Public class/service method: one `describe('ClassName.methodName')`.
- Do not add a wrapper `describe` around multiple methods.
- Do not create nested `describe` blocks merely for categories such as loading, errors, happy path, edge cases, or interactions.
- Keep all cases for the same public subject inside that subject's single `describe`.
- Use descriptive `it` names to express scenario and expected behavior.

If neighboring tests conflict with this organization rule, this rule wins unless the user explicitly asks to preserve the neighboring style.

## File Naming And Placement

- Place tests beside the implementation they test.
- Preserve the exact implementation basename:
  - `Thing.tsx` -> `Thing.test.tsx`
  - `thing.api.ts` -> `thing.api.test.ts`
  - `thing.schema.ts` -> `thing.schema.test.ts`
  - `thing.service.ts` -> `thing.service.test.ts`
- Preserve the implementation directory and feature boundary.
- Do not create generic `tests/`, `misc.test.*`, or combined cross-feature test files when colocated tests are appropriate.
- One test file has one clear implementation subject/file boundary.
- Keep feature-specific fixtures and mocks local. Put reusable helpers only in the repository's established shared test-helper location.

## Coverage Workflow

Select cases from behavior and distinct implementation paths, not from percentage targets. Do not attempt meaningless Cartesian-product coverage. Use equivalence classes when multiple inputs exercise exactly the same path and outcome.

For complex UI, inventory every meaningful conditional render branch, loading/error/empty/populated/filtered state, user control, navigation callback, dialog/drawer flow, and applicable mutation state. A child test does not replace testing the parent's wiring.

For functions and server code, inventory public inputs, outputs, thrown/mapped errors, boundary calls, state changes, authorization, persistence behavior, and domain invariants.

Every inventory item must finish as one of:
- `IMPLEMENTED` — executable test exists.
- `COVERED_BY` — name the test that covers the identical behavior path.
- `NOT_APPLICABLE` — explain why.
- `BLOCKED` — state the concrete blocker.

`TODO`, `recommended`, `future test`, `could test`, and `coverage opportunity` are not acceptable final statuses for an applicable behavior when enough repository information exists to implement it.

## Client Tests

For React/Vitest/Testing Library work, read `references/react-vitest.md` before editing.

Use the repository's existing Vitest/jsdom/setup configuration and established test utilities. Prefer accessible queries and `userEvent`. Mock external boundaries rather than private component implementation. Isolate React Query clients, stores, session storage, mocks, timers, dates, and other mutable state between tests.

## Server Tests

For Node/NestJS/service/controller/repository/Prisma work, read `references/server-unit-tests.md` before editing.

Choose the narrowest test type that proves the public contract. Mock external boundaries for unit tests. Do not require a live database unless explicitly requested or the repository's established integration-test boundary requires one. Inspect package/configuration before choosing commands; never invent a runner or script.

## Financial Domain

For financial calculations, balances, transactions, currencies, dates, authorization, or persistence of financial state, read `references/financial-testing.md` and apply every relevant invariant.

Never change expected values merely to make a failing test pass. First establish whether the domain expectation or production implementation is wrong.

## Mandatory Test Execution Timing

Test generation and execution are separate phases.

### Generation phase

For all files requested in the current task:
1. Inspect and inventory.
2. Write the complete planned test code.
3. Finish all planned `describe` blocks and test cases across all requested files.

During this phase:
- Do NOT run tests after each `it`/`test`.
- Do NOT run tests after each `describe`.
- Do NOT run tests after each file edit.
- Do NOT repeatedly execute tests while the requested suite is still being generated.

### Validation phase

After test code is complete for ALL requested files:
1. Run the narrowest command covering all changed/requested test files.
2. Review all failures together.
3. Classify each failure as a test defect, production defect, environment/configuration issue, or incorrect expectation.
4. Fix test defects together.
5. Rerun the focused tests after fixes.
6. Repeat only when a validation run exposed failures requiring changes.

Do not rerun an already-passing focused suite without a concrete reason.

A test-writing task is not complete until generated tests have been executed at least once, unless execution is technically blocked. If blocked, do not claim tests passed; report the exact intended command, blocker, and that the tests remain unvalidated.

Run type-checking after the focused tests only when relevant and available. Do not run build, watch, dev-build, broad lint/format, or live-server/database commands unless explicitly requested.

## Reporting

Report concisely:
- files created or changed;
- public subjects and behaviors covered;
- focused commands run and results;
- production defects discovered;
- inventory reconciliation and genuine residual gaps/blockers.
