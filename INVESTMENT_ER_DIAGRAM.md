# Investment ER Diagram

This document captures the agreed investment ER schema plus the new `INVESTMENT_ASSET_TAXONOMY` extension for future DB-backed taxonomy management.

## Extended Investment ERD

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

  FINANCIAL_ACCOUNT ||--o{ TRANSACTION : source_account
  FINANCIAL_ACCOUNT ||--o{ TRANSACTION : destination_account
  FINANCIAL_ACCOUNT ||--o{ INVESTMENT : primary_account
  FINANCIAL_ACCOUNT ||--o{ INVESTMENT_EVENT : funded_from

  GOAL ||--o{ INVESTMENT_GOAL_ALLOCATION : receives_allocation

  INVESTMENT ||--o{ INVESTMENT_EVENT : has_events
  INVESTMENT ||--o{ INVESTMENT_GOAL_ALLOCATION : allocated_to_goals
  INVESTMENT ||--o{ VALUATION_SNAPSHOT : has_valuations
  INVESTMENT_ASSET_TAXONOMY ||--o{ INVESTMENT_ASSET_TAXONOMY : parent_child
  INVESTMENT_ASSET_TAXONOMY ||--o{ INVESTMENT : classifies

  INVESTMENT_EVENT o|--|| TRANSACTION : cash_link

  USER {
    string id PK
    string email
    string password
    string name
    datetime createdAt
    datetime updatedAt
  }

  CATEGORY {
    string id PK
    string userId FK
    string name
    string type
    string icon
    string color
    boolean isSystem
    datetime createdAt
    datetime updatedAt
  }

  FINANCIAL_ACCOUNT {
    string id PK
    string userId FK
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

  TRANSACTION {
    string id PK
    string userId FK
    string categoryId FK
    string goalId FK
    string sourceAccountId FK
    string destinationAccountId FK
    string linkedInvestmentEventId FK
    string type
    string transactionKind
    float amount
    string categoryLabelSnapshot
    datetime date
    string notes
    datetime createdAt
    datetime updatedAt
  }

  GOAL {
    string id PK
    string userId FK
    string categoryId FK
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

  INVESTMENT {
    string id PK
    string userId FK
    string accountId FK
    string assetTaxonomyId FK
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
    string notes
    json documentsMeta
    datetime createdAt
    datetime updatedAt
  }

  INVESTMENT_ASSET_TAXONOMY {
    string id PK
    string key
    string label
    string nodeType
    int level
    string parentId FK
    int sortOrder
    boolean isActive
    datetime createdAt
    datetime updatedAt
  }

  INVESTMENT_EVENT {
    string id PK
    string investmentId FK
    string sourceAccountId FK
    string linkedTransactionId FK
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

  INVESTMENT_GOAL_ALLOCATION {
    string id PK
    string investmentId FK
    string goalId FK
    string allocationType
    float allocationPercent
    float allocationAmount
    datetime effectiveFrom
    datetime effectiveTo
    datetime createdAt
    datetime updatedAt
  }

  VALUATION_SNAPSHOT {
    string id PK
    string userId FK
    string investmentId FK
    datetime snapshotDate
    float marketValue
    float units
    float price
    string source
    datetime createdAt
  }
```

## Extension Notes

- This is an extension to the agreed schema, not a replacement.
- `Investment.assetType` and `Investment.assetCategory` remain in place for compatibility.
- `Investment.assetTaxonomyId` is the new optional hook into a future taxonomy tree.
- `InvestmentAssetTaxonomy.parentId` stores the parent-child relationship.
- The intended hierarchy can grow gradually up to 5 levels.