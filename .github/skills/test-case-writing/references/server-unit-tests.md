# Server JavaScript/TypeScript Unit Tests

## Select The Narrowest Boundary

- Pure function: direct unit test.
- Service: unit test orchestration, domain decisions, and boundary contracts.
- NestJS dependency/guard/controller wiring: use `TestingModule` when DI behavior matters.
- Repository: test query/mapping/persistence-error/transaction behavior at the repository boundary.
- HTTP/integration: use only when middleware, serialization, validation pipeline, or route contract requires the full boundary.

## Public Subject Inventory

For each exported function/public method inspect:
- normal result;
- empty/no-op result;
- null/undefined/optional inputs where permitted;
- invalid and malformed inputs;
- min/max/zero/negative/boundary values;
- dependency success/failure;
- mapped domain/HTTP errors;
- authorization/ownership failures;
- duplicate/idempotent/retry behavior when state changes;
- exact repository/API payloads when they are contractual;
- transaction and rollback behavior where applicable.

## NestJS

Test guards, DTO validation, controller/service boundaries, ownership checks, status/error contracts, and DI wiring only at the layer that owns them. Do not duplicate the same assertion across controller and service tests unless each layer has a distinct contract.

## Prisma/Repositories

For unit tests, mock `PrismaService` or the repository boundary. Verify meaningful query arguments, mapping, not-found/conflict/persistence errors, and transaction boundaries. Do not require a live database by default.

## Commands

Inspect `package.json`, workspace configuration, and neighboring tests before selecting a command. Use the repository's configured runner. Never invent a server test command or silently introduce a new framework.
