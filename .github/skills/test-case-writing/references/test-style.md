# Test Style

## Test Structure

Tests must produce clear, diagnostic console output.

Use this hierarchy:

```text
<Subject> > <Method/Function> > <Use Case>
```

### Root `describe`

Use exactly one root `describe` for the subject under test.

Use its exact recognizable name:

- Class/service/controller/repository -> exact class name
- React component -> exact component name
- Hook -> exact hook name
- File containing multiple exported functions -> implementation basename
- File containing one primary exported function -> exact function name

```ts
describe('AccountService', () => {});
describe('AccountForm', () => {});
describe('transaction.utils', () => {});
describe('calculateBalance', () => {});
```

Do not add generic text such as `tests`, `test suite`, or `unit tests`.

### Nested `describe`

When the subject contains multiple methods/functions, use one nested `describe` per method/function.

Use only its exact implementation name.

```ts
describe('AccountService', () => {
  describe('create', () => {});
  describe('update', () => {});
});
```

Do not create category/scenario describes such as:

```ts
describe('success cases', ...);
describe('error cases', ...);
describe('validation', ...);
describe('edge cases', ...);
describe('rendering', ...);
```

Scenarios belong in `it`.

Do not repeat a single primary function:

```ts
// Correct
describe('calculateBalance', () => {
  it('returns zero when there are no transactions', () => {});
});

// Wrong
describe('calculateBalance', () => {
  describe('calculateBalance', () => {});
});
```

### `it`

`it` describes only the use case and expected observable behavior.

```ts
describe('AccountService', () => {
  describe('create', () => {
    it('creates an account when the request is valid', () => {});
    it('rejects the request when the account already exists', () => {});
  });
});
```

Do not repeat information already supplied by parent describes.

```ts
// Avoid
it('AccountService create should create an account', ...);

// Prefer
it('creates an account when the request is valid', ...);
```

A failure should be understandable directly from console output:

```text
AccountService
  create
    rejects the request when the account already exists
```

## React Components

Use the component name as the root `describe`.

Use a nested `describe` only when there is an actual named method/function that is meaningful to the test.

Do not invent method names merely to satisfy the hierarchy.

Component behavior without such a method belongs directly under the component:

```tsx
describe('AccountSummary', () => {
  it('displays a loading indicator while data is loading', () => {});
  it('displays the empty state when no accounts exist', () => {});
});
```

Test observable behavior rather than private implementation details.

## No Duplicate Tests

Do not generate duplicate or semantically equivalent tests.

Before adding a test, determine whether an existing or planned test already proves the same behavioral contract.

Different wording or different sample data does not make a test unique.

```ts
// Duplicate - keep only one
it('rejects the request when the account already exists', ...);
it('throws an error for an existing account', ...);
```

Use `it.each` when multiple representative inputs prove the same rule.

Keep separate tests when they exercise different branches, contracts, state transitions, errors, or domain invariants.

Minimize duplication, not meaningful coverage.

## General Style

- One `it` protects one coherent behavior or contract.
- Prefer behavior-oriented test names.
- Test public/observable behavior instead of private implementation.
- Mock external boundaries rather than the subject under test.
- Keep fixtures and setup as small as practical.
- Use existing repository helpers and conventions where applicable.
- Do not add comments that merely restate obvious test code.
- Do not use snapshots when focused behavioral assertions are clearer.

## Final Check

Before completing a test file, verify:

- one root `describe` identifies the subject;
- nested `describe` names are exact method/function names;
- no artificial category `describe` blocks exist;
- `it` names contain only the use case/behavior;
- parent names are not unnecessarily repeated;
- no duplicate or semantically equivalent tests exist;
- console output clearly identifies what failed.
