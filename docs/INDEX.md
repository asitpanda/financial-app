# Technical Documentation

This folder is the single home for the technical understanding of My Financial.

## Reading order

1. [Architecture](./ARCHITECTURE.md)
2. [Data model and schema](./DATA_MODEL_AND_SCHEMA.md)
3. [Technical diagrams](./reference/diagrams/README.md)
4. [Entity relationship diagrams](./reference/er-diagrams/INVESTMENT_ER_DIAGRAM.md)

## Documents

| Document | Purpose |
|---|---|
| [Architecture](./ARCHITECTURE.md) | System structure, module boundaries, runtime flows, and technical constraints |
| [Data model and schema](./DATA_MODEL_AND_SCHEMA.md) | Persistence source of truth, relationships, schema rules, and synchronization |
| [Technical diagrams](./reference/diagrams/README.md) | System, domain, and financial data-flow diagrams |
| [Investment ER diagram](./reference/er-diagrams/INVESTMENT_ER_DIAGRAM.md) | Database relationship reference |

## Source of truth

- Runtime implementation: `server/src/` and `client/src/`
- Persistence schema: `server/prisma/schema.prisma`
- SQL schema scripts: `server/prisma/sql/`
- Technical documentation: this folder

Documentation explains the implementation and its constraints. It does not replace the source code or schema.