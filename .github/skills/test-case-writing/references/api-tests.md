# API Contract Tests

## Goal

Use API contract tests to prove the externally observable HTTP contract of the application.

API tests complement server unit tests. Protect business logic deeply at the layer that owns it; use API tests to verify that the application exposes that behavior correctly over HTTP.

Generate the smallest non-duplicative API test set that protects every distinct applicable public contract.

Do not reproduce the complete server business-rule test suite through HTTP.

## Test Boundary

Prefer real HTTP-level tests through the configured Nest/application test server rather than directly invoking controller methods.

Exercise the relevant application pipeline:

```text
HTTP Request
-> Route
-> Authentication / Guards
-> Validation / Transformation
-> Controller
-> Application Boundary
-> Serialization
-> HTTP Response
```