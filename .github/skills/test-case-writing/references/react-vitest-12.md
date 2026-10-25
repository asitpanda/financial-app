# React + Vitest + Testing Library

## Branch Inventory

Before editing a complex component, inspect:
- early returns;
- `if`/ternary/`&&` render branches;
- loading, error, empty, populated, and filtered states;
- null/undefined/optional data that changes visible output;
- permission, role, and feature-flag branches;
- props/enum values that materially alter rendering;
- every user-operable control and state-changing interaction;
- dialogs, drawers, menus, tabs, filters, search, forms, navigation, pagination, and sorting;
- mutation pending, success, failure, retry, cancellation, and duplicate-submit prevention where applicable.

Use equivalence classes instead of testing every value permutation when values share the same code path and outcome.

## Queries And Interaction

- Prefer `getByRole`, `findByRole`, `getByLabelText`, and other accessibility-oriented queries.
- Use `userEvent` for user workflows.
- Use `findBy*`/`waitFor` for genuine async UI changes; do not add arbitrary sleeps.
- Assert what a user can observe or what an external boundary contract requires.
- Avoid selecting by implementation-specific class names/test IDs when accessible queries are practical.

## Props

For meaningful props consider normal, omitted optional, null/undefined when permitted, empty, boundary, alternate union/enum values, and callbacks. Test only values that create distinct behavior.

## Forms

Cover applicable initial values, valid submit, required validation, invalid formats, min/max boundaries, server validation, submit failure, pending/disabled behavior, duplicate prevention, success reset, failure preservation, and cancellation.

## Async/Data Fetching

Cover applicable loading, success, empty success, malformed/partial response, error, retry, authorization/not-found/conflict/server errors, and stale/out-of-order behavior when the component explicitly handles it.

## Providers And State

Use the repository's established render helper when providers are needed. Isolate React Query clients, stores, routers, session/local storage, timers, and mocks between tests. Test parent wiring even when child components have their own tests.
