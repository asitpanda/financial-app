# Investment ER Diagram

This document is synced to the frozen investment schema currently implemented in [server/prisma/schema.prisma](/Users/asitpanda/asitprojects/mine/my-financial/server/prisma/schema.prisma).

## Final Agreed ERD

```mermaid
erDiagram
    USER ||--o{ CATEGORY : owns
    USER ||--o{ FINANCIAL_ACCOUNT : owns
    USER ||--o{ TRANSACTION : owns
    USER ||--o{ GOAL : owns
    USER ||--o{ INVESTMENT : owns
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
        string email UK
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
        int categoryId FK
        string name
        string description
        string icon
        float targetAmount
        float currentAmount
        datetime startDate
        datetime deadline
        string categoryLabelSnapshot
        datetime createdAt
        datetime updatedAt
    }

    TRANSACTION {
        bigint id PK
        int userId FK
        int categoryId FK
        int goalId FK
        int sourceAccountId FK
        int destinationAccountId FK
        int linkedInvestmentEventId FK UK
        string type
        string transactionKind
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
        string notes
        json documentsMeta
        datetime createdAt
        datetime updatedAt
    }

    INVESTMENT_ASSET_TAXONOMY {
        int id PK
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
        int sourceAccountId FK
        bigint linkedTransactionId FK UK
        string eventType
        datetime eventDate
        float amount
        float units
        float pricePerUnit
        float netAmount
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
        float amount
        string cadenceUnit
        int cadenceInterval
        datetime anchorDate
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

## Notes

- `INVESTMENT_GOAL_ALLOCATION` is removed from the agreed schema.
- `INVESTMENT.assetTaxonomyId` remains the classification hook into `INVESTMENT_ASSET_TAXONOMY`.
- `INVESTMENT.contributionMode` stores the high-level one-time vs recurring intent.
- `INVESTMENT_CONTRIBUTION_PLAN` stores recurring schedule details.
- `INVESTMENT_EVENT` stores actual executed investment activity.
- `VALUATION_SNAPSHOT` stores historical valuation points.
