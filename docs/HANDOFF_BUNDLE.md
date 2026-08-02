# Handoff Bundle

This page is the single-entry handoff for the frozen architecture baseline.

## Use This By Audience

### Backend Developers

Read in this order:

1. ../README.md
2. ARCHITECTURE.md
3. BACKEND_FOLDER_STRUCTURE.md
4. DATA_MODEL_AND_SCHEMA.md
5. data-model/INVESTMENT_ER_DIAGRAM.md

Focus areas:

- Provider-backed DI pattern (`mock | postgres | supabase`)
- Repository/data-source naming convention
- Validation and error response contract
- Request logging and request-id tracing

### Frontend Developers

Read in this order:

1. ../README.md
2. ../ARCHITECTURE.md
3. DATA_MODEL_AND_SCHEMA.md

Focus areas:

- API provider mode assumptions (`mock` must stay compatible)
- Data shape consistency across provider modes
- Error payload format (`code`, `message`, optional `field`, `details`)

### QA And Test Engineers

Read in this order:

1. ../README.md
2. ARCHITECTURE.md
3. DATA_MODEL_AND_SCHEMA.md
4. data-model/INVESTMENT_ER_DIAGRAM.md

Validation checklist:

- Same endpoint behavior under `DB_PROVIDER=mock` and `DB_PROVIDER=postgres`
- Schema-related errors map to normalized API error codes
- `x-request-id` is returned and logged per request
- DTO validation failures return flattened `details`

### DevOps And Release

Read in this order:

1. ../README.md
2. ARCHITECTURE.md
3. DATA_MODEL_AND_SCHEMA.md

Release checks:

- `DATABASE_URL` and `DB_PROVIDER` configured correctly
- Prisma client generated after schema changes
- Swagger endpoint available after deployment

### New Team Members

Recommended onboarding path:

1. ../README.md
2. This file (HANDOFF_BUNDLE.md)
3. ARCHITECTURE.md
4. BACKEND_FOLDER_STRUCTURE.md
5. DATA_MODEL_AND_SCHEMA.md
6. data-model/INVESTMENT_ER_DIAGRAM.md

## Canonical Document Set

- ../README.md
- ARCHITECTURE.md
- BACKEND_FOLDER_STRUCTURE.md
- DATA_MODEL_AND_SCHEMA.md
- data-model/INVESTMENT_ER_DIAGRAM.md
- ../ARCHITECTURE.md (frontend architecture guideline)

## Architecture Freeze Guardrails

- Do not add provider-specific conditionals inside services.
- Keep provider selection in module DI binding only.
- Keep stable repository + datasource port + adapter pattern per feature.
- Keep schema/domain/mock shape compatibility in sync.
- Keep normalized error and logging contracts unchanged unless explicitly versioned.

## Quick Operational Commands

Server:

```bash
cd server
npm run prisma:generate
npm run build
npm run start:dev
```

Client:

```bash
cd client
npm start
```

## Ownership Suggestion

- Architecture docs owner: backend lead
- Data model docs owner: backend + data owner
- Setup docs owner: platform/devops
- Frontend guideline owner: frontend lead

Update this handoff page whenever canonical docs move or ownership changes.
