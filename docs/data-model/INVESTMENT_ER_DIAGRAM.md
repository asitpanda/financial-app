# Database ER Diagram

This document is generated from the canonical PostgreSQL schema in [server/prisma/sql/dump-my_react_app-202609201913.sql](../../server/prisma/sql/dump-my_react_app-202609201913.sql). The Prisma models in [server/prisma/schema.prisma](../../server/prisma/schema.prisma) provide application-side naming context.

## Complete ERD

```mermaid
erDiagram
    USERS ||--o{ CATEGORIES : owns
    USERS ||--o{ FINANCIAL_ACCOUNTS : owns
    USERS ||--o{ TRANSACTIONS : owns
    USERS ||--o{ GOALS : owns
    USERS ||--o{ INVESTMENTS : owns
    USERS ||--o{ INVESTMENT_ASSET_TAXONOMY : owns
    USERS ||--o{ VALUATION_SNAPSHOTS : owns

    CATEGORIES ||--o{ TRANSACTIONS : classifies
    CATEGORIES ||--o{ GOALS : classifies
    GOALS o|--o{ TRANSACTIONS : links

    FINANCIAL_ACCOUNTS o|--o{ TRANSACTIONS : source_account
    FINANCIAL_ACCOUNTS o|--o{ TRANSACTIONS : destination_account
    FINANCIAL_ACCOUNTS o|--o{ INVESTMENTS : primary_account

    APP_META_CONFIG_REF o|--o{ APP_META_CONFIG_REF : parent_child
    APP_META_CONFIG_REF o|--o{ INVESTMENTS : asset_type
    APP_META_CONFIG_REF o|--o{ INVESTMENTS : asset_category
    APP_META_CONFIG_REF o|--o{ INVESTMENT_ASSET_TAXONOMY : default_asset_type
    APP_META_CONFIG_REF o|--o{ INVESTMENT_ASSET_TAXONOMY : default_asset_category

    INVESTMENT_ASSET_TAXONOMY o|--o{ INVESTMENT_ASSET_TAXONOMY : parent_child
    INVESTMENT_ASSET_TAXONOMY o|--o{ INVESTMENTS : categorizes

    INVESTMENTS ||--o{ INVESTMENT_CONTRIBUTION_PLANS : schedules
    INVESTMENTS ||--o{ INVESTMENT_EVENTS : records
    INVESTMENTS ||--o{ INVESTMENT_BENEFITS : provides
    INVESTMENTS ||--o{ VALUATION_SNAPSHOTS : valued_by
    INVESTMENT_CONTRIBUTION_PLANS o|--o{ INVESTMENT_EVENTS : generates
    TRANSACTIONS o|--o| INVESTMENT_EVENTS : linked_transaction
    INVESTMENT_BENEFITS o|--o{ INVESTMENT_EVENTS : linked_benefit

    USERS {
        int id PK
        varchar userId UK
        text email UK
        varchar mobile UK
        text password
        text name
        timestamptz createdAt
        timestamptz updatedAt
    }

    CATEGORIES {
        int id PK
        int userId FK
        text name
        text type
        text icon
        text color
        boolean isSystem
        timestamptz createdAt
        timestamptz updatedAt
    }

    FINANCIAL_ACCOUNTS {
        int id PK
        int userId FK
        text name
        text displayName
        text accountType
        text institutionName
        text accountNumberMasked
        text currency
        boolean isActive
        timestamptz createdAt
        timestamptz updatedAt
        numeric openingBalance
    }

    GOALS {
        int id PK
        int userId FK
        int categoryId FK
        text name
        text description
        text icon
        float targetAmount
        float currentAmount
        timestamptz startDate
        timestamptz deadline
        text categoryLabelSnapshot
        timestamptz createdAt
        timestamptz updatedAt
    }

    TRANSACTIONS {
        int id PK
        int userId FK
        int categoryId FK
        int goalId FK
        int sourceAccountId FK
        int destinationAccountId FK
        TransactionType type
        float amount
        text categoryLabelSnapshot
        timestamptz date
        text notes
        timestamptz createdAt
        timestamptz updatedAt
    }

    APP_META_CONFIG_REF {
        int id PK
        text module
        text configType
        int parentId FK
        text code UK
        text label
        boolean isActive
        int sortOrder
        timestamptz createdAt
        timestamptz updatedAt
        AccountingTreatment accountingTreatment
    }

    INVESTMENT_ASSET_TAXONOMY {
        int id PK
        text label
        text nodeType
        int level
        int parentId FK
        int sortOrder
        boolean isActive
        timestamptz createdAt
        timestamptz updatedAt
        int userId FK
        int defaultAssetTypeMetaId FK
        int defaultAssetCategoryMetaId FK
    }

    INVESTMENTS {
        int id PK
        int userId FK
        int accountId FK
        int assetTaxonomyId FK
        text name
        text institutionName
        text referenceNumber
        text status
        timestamptz startDate
        timestamptz maturityDate
        text currency
        float totalInvested
        float currentValue
        text currentValueSource
        timestamptz lastValuationAt
        float insuranceCover
        InvestmentContributionMode contributionMode
        text notes
        timestamptz createdAt
        timestamptz updatedAt
        int assetTypeMetaId FK
        int assetCategoryMetaId FK
        AccountingTreatment accountingTreatmentOverride
    }

    INVESTMENT_CONTRIBUTION_PLANS {
        int id PK
        int investmentId FK
        text status
        numeric amount
        text cadenceUnit
        int cadenceInterval
        timestamptz anchorDate
        timestamptz nextDueDate
        timestamptz endDate
        int reminderDaysBefore
        boolean autoCreateEvent
        text notes
        timestamptz createdAt
        timestamptz updatedAt
        HistoricalImportMode historicalImportMode
        timestamptz lastGeneratedDueDate
    }

    INVESTMENT_EVENTS {
        int id PK
        int investmentId FK
        int linkedTransactionId FK
        InvestmentEventType eventType
        timestamptz eventDate
        numeric amount
        float units
        numeric pricePerUnit
        numeric netAmount
        text notes
        jsonb meta
        timestamptz createdAt
        timestamptz updatedAt
        int recurringPlanId FK
        timestamptz dueDate
        InvestmentEventStatus status
        InvestmentEventSource eventSource
        int sequenceNumber
        int linkedBenefitId FK
    }

    INVESTMENT_BENEFITS {
        int id PK
        int investmentId FK
        InvestmentBenefitType benefitType
        numeric amount
        timestamptz benefitDate
        InvestmentBenefitStatus status
        text notes
        timestamptz createdAt
        timestamptz updatedAt
    }

    VALUATION_SNAPSHOTS {
        int id PK
        int userId FK
        int investmentId FK
        timestamptz snapshotDate
        float marketValue
        float units
        float price
        text source
        timestamptz createdAt
    }
```

## Schema Notes

- `o|` marks an optional child-side foreign key. Nullable foreign keys are `SET NULL` on deletion unless noted otherwise.
- User-owned records are deleted with their user through `ON DELETE CASCADE`.
- Category references on `transactions` and `goals`, and asset metadata references on `investments`, use `ON DELETE RESTRICT`.
- `investment_events.linkedTransactionId` is nullable and unique, so a transaction can link to at most one investment event. The foreign key uses `ON DELETE SET NULL`.
- `investment_events` can optionally link to a contribution plan and benefit. The recurring-event unique index prevents duplicate `(recurringPlanId, dueDate, eventType)` combinations.
- `app_meta_config_ref` and `investment_asset_taxonomy` are self-referencing trees. Their nullable parent references use `ON DELETE SET NULL`.
- The `investments` trigger `validate_investment_meta_config_pair` requires active investment asset-type and asset-category config rows whose parent relationship matches.
- The `investment_asset_taxonomy` trigger `validate_investment_taxonomy_defaults_meta` validates optional default metadata and requires a type when a category default is set.
- PostgreSQL enum values are defined in the SQL dump for `AccountingTreatment`, `HistoricalImportMode`, `InvestmentBenefitStatus`, `InvestmentBenefitType`, `InvestmentContributionMode`, `InvestmentEventSource`, `InvestmentEventStatus`, `InvestmentEventType`, and `TransactionType`.