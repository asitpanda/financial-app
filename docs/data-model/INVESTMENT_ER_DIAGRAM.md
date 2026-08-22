# Investment ER Diagram

This document is synced to the canonical SQL schema in server/prisma/sql/core_schema.sql.

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

    GOAL o|--o{ TRANSACTION : linked_to

    FINANCIAL_ACCOUNT ||--o{ TRANSACTION : source_account
    FINANCIAL_ACCOUNT ||--o{ TRANSACTION : destination_account
    FINANCIAL_ACCOUNT o|--o{ INVESTMENT : primary_account

    APP_META_CONFIG_REF ||--o{ APP_META_CONFIG_REF : parent_child
    APP_META_CONFIG_REF ||--o{ INVESTMENT : asset_type
    APP_META_CONFIG_REF ||--o{ INVESTMENT : asset_category
    APP_META_CONFIG_REF o|--o{ INVESTMENT_ASSET_TAXONOMY : default_asset_type
    APP_META_CONFIG_REF o|--o{ INVESTMENT_ASSET_TAXONOMY : default_asset_category

    INVESTMENT_ASSET_TAXONOMY ||--o{ INVESTMENT_ASSET_TAXONOMY : parent_child
    INVESTMENT_ASSET_TAXONOMY o|--o{ INVESTMENT : categorizes

    INVESTMENT ||--o{ INVESTMENT_EVENT : has
    INVESTMENT ||--o{ INVESTMENT_CONTRIBUTION_PLAN : scheduled_by
    INVESTMENT ||--o{ VALUATION_SNAPSHOT : has
    INVESTMENT_CONTRIBUTION_PLAN o|--o{ INVESTMENT_EVENT : schedules

    TRANSACTION o|--o{ INVESTMENT_EVENT : linkedTransactionId

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
        decimal openingBalance
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
        int categoryId FK
        int goalId FK
        int sourceAccountId FK
        int destinationAccountId FK
        float amount
        string categoryLabelSnapshot
        datetime date
        string notes
        datetime createdAt
        datetime updatedAt
    }

    APP_META_CONFIG_REF {
        int id PK
        string module
        string configType
        int parentId FK
        string code
        string label
        boolean isActive
        int sortOrder
        datetime createdAt
        datetime updatedAt
    }

    INVESTMENT {
        int id PK
        int userId FK
        int accountId FK
        int assetTaxonomyId FK
        int assetTypeMetaId FK
        int assetCategoryMetaId FK
        string name
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
        int defaultAssetTypeMetaId FK
        int defaultAssetCategoryMetaId FK
        int sortOrder
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    INVESTMENT_EVENT {
        int id PK
        int investmentId FK
        int recurringPlanId FK
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

- This ERD reflects the current table and foreign-key structure in [server/prisma/sql/core_schema.sql](/Users/asitpanda/asitprojects/mine/my-financial/server/prisma/sql/core_schema.sql) and [server/prisma/schema.prisma](/Users/asitpanda/asitprojects/mine/my-financial/server/prisma/schema.prisma).
- Child-side optionality in the relationships above follows nullable foreign keys in the SQL schema.
- `investment.assetType`/`assetCategory` free-text fields have been replaced by `assetTypeMetaId`/`assetCategoryMetaId`, both required FKs into the shared `app_meta_config_ref` table (self-referencing tree of `ASSET_TYPE`/`ASSET_CATEGORY` rows scoped by `module`/`configType`).
- `investment_asset_taxonomy` nodes can optionally carry `defaultAssetTypeMetaId`/`defaultAssetCategoryMetaId` hints into `app_meta_config_ref`; taxonomy remains an organizational bucket, not the source of truth for asset classification.
- `linkedTransactionId` on `investment_event` is a single, unique, nullable FK back to `transaction`; there is no reverse FK on the transaction side.
- `financial_accounts` do not directly fund `investment_event`/`investment_contribution_plan` rows; account linkage for investments is only via `investment.accountId` (primary account).
- `investments.status` also carries a DB-level `CHECK` constraint restricting values to `active`, `matured`, `closed` (not expressed by Prisma's type system).
- Recurring scheduler uniqueness is enforced at DB level on `(recurringPlanId, dueDate, eventType)`.
