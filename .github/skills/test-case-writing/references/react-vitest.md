# React + Vitest Testing

## Goal

Optimize for business confidence, not test count, coverage percentage, or test-file size.

Generate the smallest non-duplicative test set that protects every distinct client-side behavior that can materially affect the user or business.

Before adding a test, ask:

1. What user or business contract does this protect?
2. Is this a meaningfully different behavior or failure mode?
3. Is this contract already protected by another test?

If there is no meaningful contract, do not add the test. If another test already protects it, do not duplicate it.

Minimize test code, not meaningful coverage.

## Coverage Priority

### High Risk — Cover Deeply

Cover applicable positive, negative, failure, and meaningful boundary behavior for:

- forms that create or modify business data;
- client-side business and form validation;
- permissions and action availability;
- destructive or irreversible actions;
- account/entity selection controlling an operation;
- balance or financial state manipulated by the client;
- mutation payloads and post-mutation behavior;
- duplicate submission prevention;
- shared Zustand state controlling important workflows;
- financial values associated with the correct account, currency, date, or period;
- chart transformation and drill-down context used for business decisions.

Do not retest financial calculations owned by the backend. Test that backend-provided values are displayed, labeled, associated, and used correctly by the client.

### Medium Risk — Cover Distinct User-Visible States

Cover meaningful alternatives such as:

- loading;
- populated;
- empty;
- error;
- filtered/no-results;
- permission-restricted;
- disabled/pending;
- retry/cancel;
- dialog or drawer state;
- relevant optional or malformed data.

Test each distinct contract once. Do not exhaustively combine states when combinations exercise the same behavior.

### Low Risk — Normally Do Not Test Directly

Do not add tests solely for:

- CSS or styling;
- DOM nesting;
- static markup;
- presentation-only JSX branches;
- React implementation details;
- trivial pass-through props;
- third-party library internals;
- equivalent values exercising the same rule.

Test a UI condition when it changes what the user can understand, decide, or do.

## User Workflows

Prefer meaningful workflows over many tiny interaction tests.

For important mutations, cover the applicable flow:

```text
user action
-> input/selection
-> validation
-> submit
-> correct request
-> success behavior
-> relevant refresh/state update
```

Also protect meaningful failure and recovery:

```text
submit
-> request fails
-> useful error
-> state/input preserved when appropriate
-> retry or cancel
```

Split workflows only when separate tests improve failure diagnosis or represent different contracts.

## Forms

Because client validation is owned by the UI, test meaningful validation rules and submission behavior.

Cover as applicable:

- valid submission;
- required fields;
- invalid formats;
- meaningful minimum/maximum, zero, negative, precision, or date boundaries;
- conditional/dependent validation;
- server validation errors;
- submission failure;
- disabled state while saving;
- duplicate submission prevention;
- reset after success;
- preservation after failure;
- cancellation.

Use equivalence classes. Do not create many tests for different values that exercise the same validation rule.

## Zustand

Treat Zustand as an application-state boundary when state is shared across components.

### Store Tests

Test meaningful state transitions and store actions directly when the store contains application behavior.

Keep trivial setters light. Do not manufacture edge cases unless values have different business meaning.

### Component Tests

Test observable component behavior caused by relevant store state.

Do not assert Zustand implementation mechanics such as whether the hook was called.

Reset or isolate store state between tests using the repository's established pattern. Tests must not depend on execution order or state left by another test.

### Cross-Component Workflows

For important workflows shared through Zustand, prefer the real store and test:

```text
user action
-> component A
-> Zustand state transition
-> component B reacts
-> correct user/business outcome
```

Do not repeat the same contract at the store, component, and workflow levels merely for coverage. Each layer must protect a distinct responsibility.

## Components and Child Components

Render application-owned child components by default when this provides useful confidence in real wiring.

Mock a child when its internals are irrelevant to the parent's contract or introduce unnecessary complexity, instability, expensive setup, or third-party behavior.

Mock infrastructure and external boundaries rather than application behavior.

A child component test does not replace important parent wiring coverage. A parent test should not duplicate behavior already owned by the child.

## Charts and Drill-Down

Do not test chart-library SVG, canvas, paths, dimensions, or rendering internals.

Test the application's chart contract:

- client-owned data transformation;
- correct value-to-label/category association;
- meaningful empty/error states;
- correct drill-down selection and context;
- preservation of account/entity/date/filter context;
- correct navigation, state transition, or request resulting from drill-down.

Test business meaning around the chart, not the charting library.

## API and Async Boundaries

Mock API/network boundaries rather than private component implementation.

Verify method, URL, payload, response handling, notifications, or query invalidation when they are part of the client's contract.

Cover pending, success, failure, retry, cancellation, or stale behavior only when applicable to the feature.

Do not reproduce backend unit tests in the client. The client owns API orchestration and presentation, not backend financial calculations.

## Testing Library Style

Use the repository's existing Vitest, jsdom, setup, and shared test utilities.

Prefer accessible queries such as `getByRole` and `getByLabelText`.

Use `userEvent` for user workflows.

Assert what the user can observe rather than internal React state or implementation details.

Isolate React Query clients, Zustand state, storage, mocks, and timers when used.

Avoid snapshots when focused behavioral assertions communicate the contract more clearly.

## Coverage Decision

A candidate test normally belongs in the suite when its failure could cause:

- incorrect or misleading business information;
- an invalid or unauthorized user action;
- a valid action to be blocked;
- the wrong entity, account, or context to be modified;
- a broken important workflow;
- incorrect client validation;
- lost user work after a recoverable failure;
- stale or incorrect shared state;
- incorrect chart or drill-down context;
- an unrecoverable expected error.

Otherwise, do not add it unless the implementation reveals another meaningful business or user contract.

## Final Coverage Check

Before finishing, reconcile the tests against the implementation and report:

- business/user contracts covered;
- meaningful states and failure/recovery paths covered;
- important Zustand and cross-component workflows covered;
- intentionally untested presentation/library behavior;
- genuine residual business gaps or blockers.

Do not use test count or coverage percentage alone as evidence of test quality.

The target is complete protection of distinct business and user contracts with the smallest maintainable, non-duplicative suite.
