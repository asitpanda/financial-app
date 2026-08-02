# Investment ER Diagram

This document is synced to canonical data structures in server/src/domain/types.ts and current mock fixtures in server/src/mockdata/\*.ts.

## Core ERD

```mermaid
erDiagram
    USER ||--o{ CATEGORY : owns
    USER ||--o{ FINANCIAL_ACCOUNT : owns
    USER ||--o{ TRANSACTION : owns
    USER ||--o{ GOAL : owns
    USER ||--o{ INVESTMENT : owns
    USER ||--o{ INVESTMENT_ASSET_TAXONOMY : owns
    USER ||--o{ VALUATION_SNAPSHOT : owns

    CATEGORY ||--o{ TRANSACTION : classifies
    CATEGORY ||--o{ GOAL : classifies

    GOAL ||--o{ TRANSACTION : linked_to

    FINANCIAL_ACCOUNT ||--o{ TRANSACTION : source_account
    FINANCIAL_ACCOUNT ||--o{ TRANSACTION : destination_account
    FINANCIAL_ACCOUNT ||--o{ INVESTMENT : primary_account
    FINANCIAL_ACCOUNT ||--o{ INVESTMENT_EVENT : funds_event
    FINANCIAL_ACCOUNT ||--o{ INVESTMENT_CONTRIBUTION_PLAN : funds_plan

    INVESTMENT_ASSET_TAXONOMY ||--o{ INVESTMENT_ASSET_TAXONOMY : parent_child
    INVESTMENT_ASSET_TAXONOMY ||--o{ INVESTMENT : categorizes

    INVESTMENT ||--o{ INVESTMENT_EVENT : has
    INVESTMENT ||--o{ INVESTMENT_CONTRIBUTION_PLAN : scheduled_by
    INVESTMENT ||--o{ VALUATION_SNAPSHOT : has

    TRANSACTION o|--o| INVESTMENT_EVENT : linked_event

    USER {
        int id PK
        string userId
        string email
        string mobile
        string password
        string name
        datetime createdAt
        datetime updatedAt
    }

    CATEGORY {
        int id PK
        int userId FK
        string name
        string type
        string icon
        string color
        boolean isSystem
        datetime createdAt
        datetime updatedAt
    }

    FINANCIAL_ACCOUNT {
        int id PK
        int userId FK
        string name
        string displayName
        string accountType
        string institutionName
        string accountNumberMasked
        string currency
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    GOAL {
        int id PK
        int userId FK
        string name
        int categoryId FK
        string categoryLabelSnapshot
        string description
        string icon
        float targetAmount
        float currentAmount
        datetime startDate
        datetime deadline
        datetime createdAt
        datetime updatedAt
    }

    TRANSACTION {
        int id PK
        int userId FK
        string type
        string transactionKind
        int categoryId FK
        int goalId FK
        int sourceAccountId FK
        int destinationAccountId FK
        int linkedInvestmentEventId FK
        float amount
        string categoryLabelSnapshot
        datetime date
        string notes
        datetime createdAt
        datetime updatedAt
    }

    INVESTMENT {
        int id PK
        int userId FK
        int accountId FK
        int assetTaxonomyId FK
        string name
        string assetType
        string assetCategory
        string holdingMode
        string institutionName
        string referenceNumber
        string status
        datetime startDate
        datetime maturityDate
        string currency
        float totalInvested
        float currentValue
        string currentValueSource
        datetime lastValuationAt
        float insuranceCover
        string contributionMode
        json documentsMeta
        string notes
        datetime createdAt
        datetime updatedAt
    }

    INVESTMENT_ASSET_TAXONOMY {
        int id PK
        int userId FK
        string label
        string nodeType
        int level
        int parentId FK
        int sortOrder
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    INVESTMENT_EVENT {
        int id PK
        int investmentId FK
        int recurringPlanId FK
        int sourceAccountId FK
        int linkedTransactionId FK
        string eventType
        datetime dueDate
        string status
        string eventSource
        int sequenceNumber
        datetime eventDate
        decimal amount
        float units
        decimal pricePerUnit
        decimal netAmount
        string notes
        json meta
        datetime createdAt
        datetime updatedAt
    }

    INVESTMENT_CONTRIBUTION_PLAN {
        int id PK
        int investmentId FK
        int sourceAccountId FK
        string status
        decimal amount
        string cadenceUnit
        int cadenceInterval
        string historicalImportMode
        datetime anchorDate
        datetime lastGeneratedDueDate
        datetime nextDueDate
        datetime endDate
        int reminderDaysBefore
        boolean autoCreateEvent
        string notes
        datetime createdAt
        datetime updatedAt
    }

    VALUATION_SNAPSHOT {
        int id PK
        int userId FK
        int investmentId FK
        datetime snapshotDate
        float marketValue
        float units
        float price
        string source
        datetime createdAt
    }
```

## Sync Notes

- This ERD reflects the canonical key set in server/src/domain/types.ts and is validated against current fixtures.
- Transaction and investment-event link ids are int in the current model (not bigint).
- Recurring scheduler uniqueness is enforced at DB level on `(recurringPlanId, dueDate, eventType)`.
- Nullability is defined by TypeScript unions in [server/src/domain/types.ts](server/src/domain/types.ts), because Mermaid ER attribute syntax does not support a nullable marker.
