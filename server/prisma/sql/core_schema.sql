--
-- PostgreSQL database dump
--

\restrict AhN4XZzvbFVnpBQzVTBWSW5lWDwq4HqHCHJmb6eOGNiLpnLQqAcGF1IcFJoZf4C

-- Dumped from database version 16.10 (Homebrew)
-- Dumped by pg_dump version 16.10 (Homebrew)

-- Started on 2026-09-20 19:41:51 IST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 918 (class 1247 OID 2905842)
-- Name: AccountingTreatment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountingTreatment" AS ENUM (
    'INVESTMENT',
    'INSURANCE_SAVINGS',
    'PROTECTION_EXPENSE'
);


--
-- TOC entry 903 (class 1247 OID 2895238)
-- Name: HistoricalImportMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HistoricalImportMode" AS ENUM (
    'OPENING_BALANCE',
    'TRACK_FROM_TODAY'
);


--
-- TOC entry 924 (class 1247 OID 2905874)
-- Name: InvestmentBenefitStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvestmentBenefitStatus" AS ENUM (
    'EXPECTED',
    'RECEIVED',
    'CANCELLED'
);


--
-- TOC entry 921 (class 1247 OID 2905850)
-- Name: InvestmentBenefitType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvestmentBenefitType" AS ENUM (
    'MATURITY',
    'COUPON',
    'INTEREST',
    'PRINCIPAL_REDEMPTION',
    'ANNUITY',
    'MONEY_BACK',
    'SURVIVAL',
    'BONUS',
    'RETURN_OF_PREMIUM',
    'DEATH_BENEFIT',
    'OTHER'
);


--
-- TOC entry 912 (class 1247 OID 2899302)
-- Name: InvestmentContributionMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvestmentContributionMode" AS ENUM (
    'ONE_TIME',
    'RECURRING'
);


--
-- TOC entry 900 (class 1247 OID 2892818)
-- Name: InvestmentEventSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvestmentEventSource" AS ENUM (
    'MANUAL',
    'RECURRING_PLAN',
    'HISTORICAL_IMPORT',
    'BANK_IMPORT',
    'BROKER_IMPORT',
    'SYSTEM_GENERATED'
);


--
-- TOC entry 897 (class 1247 OID 2892804)
-- Name: InvestmentEventStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvestmentEventStatus" AS ENUM (
    'EXPECTED',
    'PENDING',
    'CONFIRMED',
    'SKIPPED',
    'FAILED',
    'CANCELLED'
);


--
-- TOC entry 906 (class 1247 OID 2895244)
-- Name: InvestmentEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvestmentEventType" AS ENUM (
    'CONTRIBUTION',
    'OPENING_BALANCE',
    'OPENING_INCOME_CREDIT',
    'WITHDRAWAL_PRINCIPAL',
    'INCOME_CREDIT',
    'PREMIUM'
);


--
-- TOC entry 915 (class 1247 OID 2902515)
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionType" AS ENUM (
    'INCOME',
    'EXPENSE',
    'TRANSFER',
    'INVESTMENT'
);


--
-- TOC entry 241 (class 1255 OID 2899290)
-- Name: validate_investment_meta_config_pair(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_investment_meta_config_pair() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  type_row public.app_meta_config_ref%ROWTYPE;
  category_row public.app_meta_config_ref%ROWTYPE;
BEGIN
  SELECT * INTO type_row
  FROM public.app_meta_config_ref
  WHERE "module" = 'INVESTMENT'
    AND "configType" = 'ASSET_TYPE'
    AND "id" = NEW."assetTypeMetaId"
    AND "isActive" = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid investment assetTypeMetaId: %', NEW."assetTypeMetaId";
  END IF;

  SELECT * INTO category_row
  FROM public.app_meta_config_ref
  WHERE "module" = 'INVESTMENT'
    AND "configType" = 'ASSET_CATEGORY'
    AND "id" = NEW."assetCategoryMetaId"
    AND "isActive" = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid investment assetCategoryMetaId: %', NEW."assetCategoryMetaId";
  END IF;

  IF category_row."parentId" IS DISTINCT FROM NEW."assetTypeMetaId" THEN
    RAISE EXCEPTION 'assetCategoryMetaId % is not valid for assetTypeMetaId %', NEW."assetCategoryMetaId", NEW."assetTypeMetaId";
  END IF;

  RETURN NEW;
END;
$$;


--
-- TOC entry 253 (class 1255 OID 2899292)
-- Name: validate_investment_taxonomy_defaults_meta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_investment_taxonomy_defaults_meta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  category_row public.app_meta_config_ref%ROWTYPE;
BEGIN
  IF NEW."defaultAssetTypeMetaId" IS NULL AND NEW."defaultAssetCategoryMetaId" IS NOT NULL THEN
    RAISE EXCEPTION 'defaultAssetTypeMetaId is required when defaultAssetCategoryMetaId is set';
  END IF;

  IF NEW."defaultAssetCategoryMetaId" IS NOT NULL THEN
    SELECT * INTO category_row
    FROM public.app_meta_config_ref
    WHERE "module" = 'INVESTMENT'
      AND "configType" = 'ASSET_CATEGORY'
      AND "id" = NEW."defaultAssetCategoryMetaId"
      AND "isActive" = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid taxonomy defaultAssetCategoryMetaId: %', NEW."defaultAssetCategoryMetaId";
    END IF;

    IF category_row."parentId" IS DISTINCT FROM NEW."defaultAssetTypeMetaId" THEN
      RAISE EXCEPTION 'defaultAssetCategoryMetaId % is not valid for defaultAssetTypeMetaId %', NEW."defaultAssetCategoryMetaId", NEW."defaultAssetTypeMetaId";
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 238 (class 1259 OID 2899244)
-- Name: app_meta_config_ref; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_meta_config_ref (
    id integer NOT NULL,
    module text NOT NULL,
    "configType" text NOT NULL,
    "parentId" integer,
    code text NOT NULL,
    label text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "accountingTreatment" public."AccountingTreatment"
);


--
-- TOC entry 237 (class 1259 OID 2899243)
-- Name: app_meta_config_ref_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.app_meta_config_ref ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_meta_config_ref_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



INSERT INTO public.app_meta_config_ref ("module", "configType", "parentId", "code", "label", "sortOrder", "accountingTreatment")
VALUES
  ('INVESTMENT', 'ASSET_TYPE', NULL, 'DEPOSIT', 'Deposit', 10, 'INVESTMENT'),
  ('INVESTMENT', 'ASSET_TYPE', NULL, 'EQUITY', 'Equity', 20, 'INVESTMENT'),
  ('INVESTMENT', 'ASSET_TYPE', NULL, 'DEBT', 'Debt', 30, 'INVESTMENT'),
  ('INVESTMENT', 'ASSET_TYPE', NULL, 'RETIREMENT', 'Retirement', 40, 'INVESTMENT'),
  -- INSURANCE has no type-level default: its categories mix INSURANCE_SAVINGS and PROTECTION_EXPENSE, so treatment is resolved per category.
  ('INVESTMENT', 'ASSET_TYPE', NULL, 'INSURANCE', 'Insurance', 50, NULL),
  ('INVESTMENT', 'ASSET_TYPE', NULL, 'COMMODITY', 'Commodity', 60, 'INVESTMENT'),
  ('INVESTMENT', 'ASSET_TYPE', NULL, 'REAL_ESTATE', 'Real Estate', 70, 'INVESTMENT'),
  ('INVESTMENT', 'ASSET_TYPE', NULL, 'ALTERNATIVE', 'Alternative', 80, 'INVESTMENT')
ON CONFLICT ("code") DO UPDATE
SET
  "module" = EXCLUDED."module",
  "configType" = EXCLUDED."configType",
  "parentId" = EXCLUDED."parentId",
  "label" = EXCLUDED."label",
  "sortOrder" = EXCLUDED."sortOrder",
  "accountingTreatment" = EXCLUDED."accountingTreatment",
  "isActive" = true,
  "updatedAt" = now();

INSERT INTO public.app_meta_config_ref ("module", "configType", "parentId", "code", "label", "sortOrder", "accountingTreatment")
SELECT 'INVESTMENT', 'ASSET_CATEGORY', parent."id", child."code", child."label", child."sortOrder", child."accountingTreatment"::public."AccountingTreatment"
FROM (
  VALUES
    ('DEPOSIT', 'BANK_DEPOSIT', 'Bank Deposit', 11, 'INVESTMENT'),
    ('DEPOSIT', 'FIXED_DEPOSIT', 'Fixed Deposit', 12, 'INVESTMENT'),
    ('DEPOSIT', 'RECURRING_DEPOSIT', 'Recurring Deposit', 13, 'INVESTMENT'),
    ('EQUITY', 'STOCK', 'Stock', 21, 'INVESTMENT'),
    ('EQUITY', 'MUTUAL_FUND', 'Mutual Fund', 22, 'INVESTMENT'),
    ('EQUITY', 'ETF', 'ETF', 23, 'INVESTMENT'),
    ('EQUITY', 'INDEX_FUND', 'Index Fund', 24, 'INVESTMENT'),
    ('DEBT', 'BOND', 'Bond', 31, 'INVESTMENT'),
    ('DEBT', 'DEBT_MUTUAL_FUND', 'Debt Mutual Fund', 32, 'INVESTMENT'),
    ('DEBT', 'GOVERNMENT_SECURITY', 'Government Security', 33, 'INVESTMENT'),
    ('RETIREMENT', 'PPF', 'PPF', 41, 'INVESTMENT'),
    ('RETIREMENT', 'NPS', 'NPS', 42, 'INVESTMENT'),
    ('RETIREMENT', 'EPF', 'EPF', 43, 'INVESTMENT'),
    ('RETIREMENT', 'PENSION_PLAN', 'Pension Plan', 44, 'INVESTMENT'),
    -- Kept as a generic/legacy bucket for existing rows; prefer the finer categories below for new products.
    ('INSURANCE', 'LIFE_INSURANCE', 'Life Insurance', 51, 'INSURANCE_SAVINGS'),
    ('INSURANCE', 'ULIP', 'ULIP', 52, 'INSURANCE_SAVINGS'),
    ('INSURANCE', 'HEALTH_INSURANCE', 'Health Insurance', 53, 'PROTECTION_EXPENSE'),
    ('INSURANCE', 'LIC_MONEY_BACK', 'LIC Money Back', 54, 'INSURANCE_SAVINGS'),
    ('INSURANCE', 'ENDOWMENT', 'Endowment', 55, 'INSURANCE_SAVINGS'),
    ('INSURANCE', 'TERM_INSURANCE', 'Term Insurance', 56, 'PROTECTION_EXPENSE'),
    ('INSURANCE', 'RETURN_OF_PREMIUM_TERM', 'Return of Premium Term Insurance', 57, 'INSURANCE_SAVINGS'),
    ('COMMODITY', 'GOLD', 'Gold', 61, 'INVESTMENT'),
    ('COMMODITY', 'SILVER', 'Silver', 62, 'INVESTMENT'),
    ('COMMODITY', 'COMMODITY_FUND', 'Commodity Fund', 63, 'INVESTMENT'),
    ('REAL_ESTATE', 'PROPERTY', 'Property', 71, 'INVESTMENT'),
    ('REAL_ESTATE', 'REIT', 'REIT', 72, 'INVESTMENT'),
    ('REAL_ESTATE', 'LAND', 'Land', 73, 'INVESTMENT'),
    ('ALTERNATIVE', 'CRYPTO', 'Crypto', 81, 'INVESTMENT'),
    ('ALTERNATIVE', 'PRIVATE_EQUITY', 'Private Equity', 82, 'INVESTMENT'),
    ('ALTERNATIVE', 'COLLECTIBLE', 'Collectible', 83, 'INVESTMENT'),
    ('ALTERNATIVE', 'OTHER_ALTERNATIVE', 'Other Alternative', 84, 'INVESTMENT')
) AS child("parentCode", "code", "label", "sortOrder", "accountingTreatment")
JOIN public.app_meta_config_ref parent
  ON parent."module" = 'INVESTMENT'
 AND parent."configType" = 'ASSET_TYPE'
 AND parent."code" = child."parentCode"
ON CONFLICT ("code") DO UPDATE
SET
  "module" = EXCLUDED."module",
  "configType" = EXCLUDED."configType",
  "parentId" = EXCLUDED."parentId",
  "label" = EXCLUDED."label",
  "sortOrder" = EXCLUDED."sortOrder",
  "accountingTreatment" = EXCLUDED."accountingTreatment",
  "isActive" = true,
  "updatedAt" = now();

--
-- TOC entry 220 (class 1259 OID 2892443)
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    icon text,
    color text,
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 219 (class 1259 OID 2892442)
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.categories ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 222 (class 1259 OID 2892459)
-- Name: financial_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_accounts (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    name text NOT NULL,
    "displayName" text NOT NULL,
    "accountType" text NOT NULL,
    "institutionName" text,
    "accountNumberMasked" text,
    currency text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "openingBalance" numeric(18,2) DEFAULT 0 NOT NULL
);


--
-- TOC entry 221 (class 1259 OID 2892458)
-- Name: financial_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.financial_accounts ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.financial_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 226 (class 1259 OID 2892492)
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goals (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "categoryId" integer NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    "targetAmount" double precision NOT NULL,
    "currentAmount" double precision DEFAULT 0 NOT NULL,
    "startDate" timestamp with time zone DEFAULT now() NOT NULL,
    deadline timestamp with time zone,
    "categoryLabelSnapshot" text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 225 (class 1259 OID 2892491)
-- Name: goals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.goals ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.goals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 2892475)
-- Name: investment_asset_taxonomy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investment_asset_taxonomy (
    id integer NOT NULL,
    label text NOT NULL,
    "nodeType" text NOT NULL,
    level integer NOT NULL,
    "parentId" integer,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "userId" integer NOT NULL,
    "defaultAssetTypeMetaId" integer,
    "defaultAssetCategoryMetaId" integer
);


--
-- TOC entry 223 (class 1259 OID 2892474)
-- Name: investment_asset_taxonomy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.investment_asset_taxonomy ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.investment_asset_taxonomy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 240 (class 1259 OID 2905882)
-- Name: investment_benefits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investment_benefits (
    id integer NOT NULL,
    "investmentId" integer NOT NULL,
    "benefitType" public."InvestmentBenefitType" NOT NULL,
    amount numeric(18,2) NOT NULL,
    "benefitDate" timestamp with time zone NOT NULL,
    status public."InvestmentBenefitStatus" DEFAULT 'EXPECTED'::public."InvestmentBenefitStatus" NOT NULL,
    notes text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 239 (class 1259 OID 2905881)
-- Name: investment_benefits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.investment_benefits ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.investment_benefits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 234 (class 1259 OID 2892597)
-- Name: investment_contribution_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investment_contribution_plans (
    id integer NOT NULL,
    "investmentId" integer NOT NULL,
    status text NOT NULL,
    amount numeric(18,2) NOT NULL,
    "cadenceUnit" text NOT NULL,
    "cadenceInterval" integer NOT NULL,
    "anchorDate" timestamp with time zone NOT NULL,
    "nextDueDate" timestamp with time zone,
    "endDate" timestamp with time zone,
    "reminderDaysBefore" integer,
    "autoCreateEvent" boolean DEFAULT false NOT NULL,
    notes text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "historicalImportMode" public."HistoricalImportMode" DEFAULT 'TRACK_FROM_TODAY'::public."HistoricalImportMode" NOT NULL,
    "lastGeneratedDueDate" timestamp with time zone
);


--
-- TOC entry 233 (class 1259 OID 2892596)
-- Name: investment_contribution_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.investment_contribution_plans ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.investment_contribution_plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 232 (class 1259 OID 2892577)
-- Name: investment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investment_events (
    id integer NOT NULL,
    "investmentId" integer NOT NULL,
    "linkedTransactionId" integer,
    "eventType" public."InvestmentEventType" NOT NULL,
    "eventDate" timestamp with time zone NOT NULL,
    amount numeric(18,2),
    units double precision,
    "pricePerUnit" numeric(18,2),
    "netAmount" numeric(18,2),
    notes text,
    meta jsonb,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "recurringPlanId" integer,
    "dueDate" timestamp with time zone,
    status public."InvestmentEventStatus" DEFAULT 'PENDING'::public."InvestmentEventStatus" NOT NULL,
    "eventSource" public."InvestmentEventSource" DEFAULT 'MANUAL'::public."InvestmentEventSource" NOT NULL,
    "sequenceNumber" integer,
    "linkedBenefitId" integer
);


--
-- TOC entry 231 (class 1259 OID 2892576)
-- Name: investment_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.investment_events ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.investment_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 228 (class 1259 OID 2892514)
-- Name: investments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investments (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "accountId" integer,
    "assetTaxonomyId" integer,
    name text NOT NULL,
    "institutionName" text,
    "referenceNumber" text,
    status text NOT NULL,
    "startDate" timestamp with time zone,
    "maturityDate" timestamp with time zone,
    currency text NOT NULL,
    "totalInvested" double precision DEFAULT 0 NOT NULL,
    "currentValue" double precision DEFAULT 0 NOT NULL,
    "currentValueSource" text,
    "lastValuationAt" timestamp with time zone,
    "insuranceCover" double precision,
    "contributionMode" public."InvestmentContributionMode" DEFAULT 'ONE_TIME'::public."InvestmentContributionMode" NOT NULL,
    notes text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "assetTypeMetaId" integer,
    "assetCategoryMetaId" integer,
    "accountingTreatmentOverride" public."AccountingTreatment"
);


--
-- TOC entry 227 (class 1259 OID 2892513)
-- Name: investments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.investments ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.investments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 230 (class 1259 OID 2892541)
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "categoryId" integer,
    "goalId" integer,
    "sourceAccountId" integer,
    "destinationAccountId" integer,
    type public."TransactionType" NOT NULL,
    amount double precision NOT NULL,
    "categoryLabelSnapshot" text,
    date timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 229 (class 1259 OID 2892540)
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.transactions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 218 (class 1259 OID 2892427)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    "userId" character varying(30),
    email text NOT NULL,
    mobile character varying(15),
    password text NOT NULL,
    name text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 217 (class 1259 OID 2892426)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 236 (class 1259 OID 2892618)
-- Name: valuation_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.valuation_snapshots (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "investmentId" integer NOT NULL,
    "snapshotDate" timestamp with time zone NOT NULL,
    "marketValue" double precision NOT NULL,
    units double precision,
    price double precision,
    source text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 235 (class 1259 OID 2892617)
-- Name: valuation_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.valuation_snapshots ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.valuation_snapshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 3837 (class 2606 OID 2899256)
-- Name: app_meta_config_ref app_meta_config_ref_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_meta_config_ref
    ADD CONSTRAINT app_meta_config_ref_code_key UNIQUE (code);


--
-- TOC entry 3841 (class 2606 OID 2899254)
-- Name: app_meta_config_ref app_meta_config_ref_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_meta_config_ref
    ADD CONSTRAINT app_meta_config_ref_pkey PRIMARY KEY (id);


--
-- TOC entry 3784 (class 2606 OID 2892452)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 3787 (class 2606 OID 2892468)
-- Name: financial_accounts financial_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_accounts
    ADD CONSTRAINT financial_accounts_pkey PRIMARY KEY (id);


--
-- TOC entry 3799 (class 2606 OID 2892502)
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- TOC entry 3795 (class 2606 OID 2892485)
-- Name: investment_asset_taxonomy investment_asset_taxonomy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_asset_taxonomy
    ADD CONSTRAINT investment_asset_taxonomy_pkey PRIMARY KEY (id);


--
-- TOC entry 3845 (class 2606 OID 2905891)
-- Name: investment_benefits investment_benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_benefits
    ADD CONSTRAINT investment_benefits_pkey PRIMARY KEY (id);


--
-- TOC entry 3829 (class 2606 OID 2892606)
-- Name: investment_contribution_plans investment_contribution_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_contribution_plans
    ADD CONSTRAINT investment_contribution_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 3822 (class 2606 OID 2892585)
-- Name: investment_events investment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_events
    ADD CONSTRAINT investment_events_pkey PRIMARY KEY (id);


--
-- TOC entry 3806 (class 2606 OID 2892524)
-- Name: investments investments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT investments_pkey PRIMARY KEY (id);


--
-- TOC entry 3813 (class 2606 OID 2895208)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 3776 (class 2606 OID 2895288)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3778 (class 2606 OID 2895290)
-- Name: users users_mobile_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_mobile_key UNIQUE (mobile);


--
-- TOC entry 3780 (class 2606 OID 2892435)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3782 (class 2606 OID 2895286)
-- Name: users users_userId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_userId_key" UNIQUE ("userId");


--
-- TOC entry 3833 (class 2606 OID 2892625)
-- Name: valuation_snapshots valuation_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valuation_snapshots
    ADD CONSTRAINT valuation_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 3838 (class 1259 OID 2899263)
-- Name: app_meta_config_ref_module_configType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "app_meta_config_ref_module_configType_idx" ON public.app_meta_config_ref USING btree (module, "configType");


--
-- TOC entry 3839 (class 1259 OID 2899264)
-- Name: app_meta_config_ref_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "app_meta_config_ref_parentId_idx" ON public.app_meta_config_ref USING btree ("parentId");


--
-- TOC entry 3785 (class 1259 OID 2892655)
-- Name: categories_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "categories_userId_idx" ON public.categories USING btree ("userId");


--
-- TOC entry 3788 (class 1259 OID 2892656)
-- Name: financial_accounts_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "financial_accounts_userId_idx" ON public.financial_accounts USING btree ("userId");


--
-- TOC entry 3797 (class 1259 OID 2892654)
-- Name: goals_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goals_categoryId_idx" ON public.goals USING btree ("categoryId");


--
-- TOC entry 3800 (class 1259 OID 2892653)
-- Name: goals_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goals_userId_idx" ON public.goals USING btree ("userId");


--
-- TOC entry 3789 (class 1259 OID 2899268)
-- Name: investment_asset_taxonomy_defaultAssetCategoryMetaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_asset_taxonomy_defaultAssetCategoryMetaId_idx" ON public.investment_asset_taxonomy USING btree ("defaultAssetCategoryMetaId");


--
-- TOC entry 3790 (class 1259 OID 2899267)
-- Name: investment_asset_taxonomy_defaultAssetTypeMetaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_asset_taxonomy_defaultAssetTypeMetaId_idx" ON public.investment_asset_taxonomy USING btree ("defaultAssetTypeMetaId");


--
-- TOC entry 3791 (class 1259 OID 2892662)
-- Name: investment_asset_taxonomy_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX investment_asset_taxonomy_level_idx ON public.investment_asset_taxonomy USING btree (level);


--
-- TOC entry 3792 (class 1259 OID 2892661)
-- Name: investment_asset_taxonomy_nodeType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_asset_taxonomy_nodeType_idx" ON public.investment_asset_taxonomy USING btree ("nodeType");


--
-- TOC entry 3793 (class 1259 OID 2892660)
-- Name: investment_asset_taxonomy_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_asset_taxonomy_parentId_idx" ON public.investment_asset_taxonomy USING btree ("parentId");


--
-- TOC entry 3796 (class 1259 OID 2892978)
-- Name: investment_asset_taxonomy_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_asset_taxonomy_userId_idx" ON public.investment_asset_taxonomy USING btree ("userId");


--
-- TOC entry 3842 (class 1259 OID 2905904)
-- Name: investment_benefits_benefitDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_benefits_benefitDate_idx" ON public.investment_benefits USING btree ("benefitDate");


--
-- TOC entry 3843 (class 1259 OID 2905902)
-- Name: investment_benefits_investmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_benefits_investmentId_idx" ON public.investment_benefits USING btree ("investmentId");


--
-- TOC entry 3846 (class 1259 OID 2905903)
-- Name: investment_benefits_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX investment_benefits_status_idx ON public.investment_benefits USING btree (status);


--
-- TOC entry 3826 (class 1259 OID 2892665)
-- Name: investment_contribution_plans_investmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_contribution_plans_investmentId_idx" ON public.investment_contribution_plans USING btree ("investmentId");


--
-- TOC entry 3827 (class 1259 OID 2892668)
-- Name: investment_contribution_plans_nextDueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_contribution_plans_nextDueDate_idx" ON public.investment_contribution_plans USING btree ("nextDueDate");


--
-- TOC entry 3830 (class 1259 OID 2892667)
-- Name: investment_contribution_plans_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX investment_contribution_plans_status_idx ON public.investment_contribution_plans USING btree (status);


--
-- TOC entry 3817 (class 1259 OID 2892980)
-- Name: investment_events_dueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_events_dueDate_idx" ON public.investment_events USING btree ("dueDate");


--
-- TOC entry 3818 (class 1259 OID 2892663)
-- Name: investment_events_investmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_events_investmentId_idx" ON public.investment_events USING btree ("investmentId");


--
-- TOC entry 3819 (class 1259 OID 2912385)
-- Name: investment_events_linkedBenefitId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_events_linkedBenefitId_idx" ON public.investment_events USING btree ("linkedBenefitId");


--
-- TOC entry 3820 (class 1259 OID 2902545)
-- Name: investment_events_linkedTransactionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "investment_events_linkedTransactionId_key" ON public.investment_events USING btree ("linkedTransactionId");


--
-- TOC entry 3823 (class 1259 OID 2895253)
-- Name: investment_events_recurringPlanId_dueDate_eventType_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "investment_events_recurringPlanId_dueDate_eventType_key" ON public.investment_events USING btree ("recurringPlanId", "dueDate", "eventType");


--
-- TOC entry 3824 (class 1259 OID 2892979)
-- Name: investment_events_recurringPlanId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investment_events_recurringPlanId_idx" ON public.investment_events USING btree ("recurringPlanId");


--
-- TOC entry 3825 (class 1259 OID 2895266)
-- Name: investment_events_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX investment_events_status_idx ON public.investment_events USING btree (status);


--
-- TOC entry 3801 (class 1259 OID 2892658)
-- Name: investments_accountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investments_accountId_idx" ON public.investments USING btree ("accountId");


--
-- TOC entry 3802 (class 1259 OID 2899266)
-- Name: investments_assetCategoryMetaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investments_assetCategoryMetaId_idx" ON public.investments USING btree ("assetCategoryMetaId");


--
-- TOC entry 3803 (class 1259 OID 2892659)
-- Name: investments_assetTaxonomyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investments_assetTaxonomyId_idx" ON public.investments USING btree ("assetTaxonomyId");


--
-- TOC entry 3804 (class 1259 OID 2899265)
-- Name: investments_assetTypeMetaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investments_assetTypeMetaId_idx" ON public.investments USING btree ("assetTypeMetaId");


--
-- TOC entry 3807 (class 1259 OID 2892657)
-- Name: investments_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "investments_userId_idx" ON public.investments USING btree ("userId");


--
-- TOC entry 3808 (class 1259 OID 2892650)
-- Name: transactions_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "transactions_categoryId_idx" ON public.transactions USING btree ("categoryId");


--
-- TOC entry 3809 (class 1259 OID 2892647)
-- Name: transactions_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_date_idx ON public.transactions USING btree (date);


--
-- TOC entry 3810 (class 1259 OID 2892652)
-- Name: transactions_destinationAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "transactions_destinationAccountId_idx" ON public.transactions USING btree ("destinationAccountId");


--
-- TOC entry 3811 (class 1259 OID 2892649)
-- Name: transactions_goalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "transactions_goalId_idx" ON public.transactions USING btree ("goalId");


--
-- TOC entry 3814 (class 1259 OID 2892651)
-- Name: transactions_sourceAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "transactions_sourceAccountId_idx" ON public.transactions USING btree ("sourceAccountId");


--
-- TOC entry 3815 (class 1259 OID 2902523)
-- Name: transactions_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_type_idx ON public.transactions USING btree (type);


--
-- TOC entry 3816 (class 1259 OID 2892646)
-- Name: transactions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "transactions_userId_idx" ON public.transactions USING btree ("userId");


--
-- TOC entry 3831 (class 1259 OID 2892670)
-- Name: valuation_snapshots_investmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "valuation_snapshots_investmentId_idx" ON public.valuation_snapshots USING btree ("investmentId");


--
-- TOC entry 3834 (class 1259 OID 2892671)
-- Name: valuation_snapshots_snapshotDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "valuation_snapshots_snapshotDate_idx" ON public.valuation_snapshots USING btree ("snapshotDate");


--
-- TOC entry 3835 (class 1259 OID 2892669)
-- Name: valuation_snapshots_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "valuation_snapshots_userId_idx" ON public.valuation_snapshots USING btree ("userId");


--
-- TOC entry 3875 (class 2620 OID 2899291)
-- Name: investments trg_validate_investment_meta_config_pair; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_investment_meta_config_pair BEFORE INSERT OR UPDATE OF "assetTypeMetaId", "assetCategoryMetaId" ON public.investments FOR EACH ROW EXECUTE FUNCTION public.validate_investment_meta_config_pair();


--
-- TOC entry 3874 (class 2620 OID 2899293)
-- Name: investment_asset_taxonomy trg_validate_investment_taxonomy_defaults_meta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_investment_taxonomy_defaults_meta BEFORE INSERT OR UPDATE OF "defaultAssetTypeMetaId", "defaultAssetCategoryMetaId" ON public.investment_asset_taxonomy FOR EACH ROW EXECUTE FUNCTION public.validate_investment_taxonomy_defaults_meta();


--
-- TOC entry 3872 (class 2606 OID 2899257)
-- Name: app_meta_config_ref app_meta_config_ref_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_meta_config_ref
    ADD CONSTRAINT "app_meta_config_ref_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.app_meta_config_ref(id) ON DELETE SET NULL;


--
-- TOC entry 3847 (class 2606 OID 2895291)
-- Name: categories categories_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3848 (class 2606 OID 2895296)
-- Name: financial_accounts financial_accounts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_accounts
    ADD CONSTRAINT "financial_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3853 (class 2606 OID 2895306)
-- Name: goals goals_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT "goals_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- TOC entry 3854 (class 2606 OID 2895301)
-- Name: goals goals_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3849 (class 2606 OID 2899285)
-- Name: investment_asset_taxonomy investment_asset_taxonomy_defaultAssetCategoryMetaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_asset_taxonomy
    ADD CONSTRAINT "investment_asset_taxonomy_defaultAssetCategoryMetaId_fkey" FOREIGN KEY ("defaultAssetCategoryMetaId") REFERENCES public.app_meta_config_ref(id) ON DELETE SET NULL;


--
-- TOC entry 3850 (class 2606 OID 2899280)
-- Name: investment_asset_taxonomy investment_asset_taxonomy_defaultAssetTypeMetaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_asset_taxonomy
    ADD CONSTRAINT "investment_asset_taxonomy_defaultAssetTypeMetaId_fkey" FOREIGN KEY ("defaultAssetTypeMetaId") REFERENCES public.app_meta_config_ref(id) ON DELETE SET NULL;


--
-- TOC entry 3851 (class 2606 OID 2895331)
-- Name: investment_asset_taxonomy investment_asset_taxonomy_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_asset_taxonomy
    ADD CONSTRAINT "investment_asset_taxonomy_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.investment_asset_taxonomy(id) ON DELETE SET NULL;


--
-- TOC entry 3852 (class 2606 OID 2895326)
-- Name: investment_asset_taxonomy investment_asset_taxonomy_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_asset_taxonomy
    ADD CONSTRAINT "investment_asset_taxonomy_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3873 (class 2606 OID 2905892)
-- Name: investment_benefits investment_benefits_investmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_benefits
    ADD CONSTRAINT "investment_benefits_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES public.investments(id) ON DELETE CASCADE;


--
-- TOC entry 3869 (class 2606 OID 2895376)
-- Name: investment_contribution_plans investment_contribution_plans_investmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_contribution_plans
    ADD CONSTRAINT "investment_contribution_plans_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES public.investments(id) ON DELETE CASCADE;


--
-- TOC entry 3865 (class 2606 OID 2895361)
-- Name: investment_events investment_events_investmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_events
    ADD CONSTRAINT "investment_events_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES public.investments(id) ON DELETE CASCADE;


--
-- TOC entry 3866 (class 2606 OID 2912380)
-- Name: investment_events investment_events_linkedBenefitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_events
    ADD CONSTRAINT "investment_events_linkedBenefitId_fkey" FOREIGN KEY ("linkedBenefitId") REFERENCES public.investment_benefits(id) ON DELETE SET NULL;


--
-- TOC entry 3867 (class 2606 OID 2895401)
-- Name: investment_events investment_events_linkedTransactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_events
    ADD CONSTRAINT "investment_events_linkedTransactionId_fkey" FOREIGN KEY ("linkedTransactionId") REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- TOC entry 3868 (class 2606 OID 2895366)
-- Name: investment_events investment_events_recurringPlanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_events
    ADD CONSTRAINT "investment_events_recurringPlanId_fkey" FOREIGN KEY ("recurringPlanId") REFERENCES public.investment_contribution_plans(id) ON DELETE SET NULL;


--
-- TOC entry 3855 (class 2606 OID 2895316)
-- Name: investments investments_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT "investments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.financial_accounts(id) ON DELETE SET NULL;


--
-- TOC entry 3856 (class 2606 OID 2899274)
-- Name: investments investments_assetCategoryMetaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT "investments_assetCategoryMetaId_fkey" FOREIGN KEY ("assetCategoryMetaId") REFERENCES public.app_meta_config_ref(id) ON DELETE RESTRICT;


--
-- TOC entry 3857 (class 2606 OID 2895321)
-- Name: investments investments_assetTaxonomyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT "investments_assetTaxonomyId_fkey" FOREIGN KEY ("assetTaxonomyId") REFERENCES public.investment_asset_taxonomy(id) ON DELETE SET NULL;


--
-- TOC entry 3858 (class 2606 OID 2899269)
-- Name: investments investments_assetTypeMetaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT "investments_assetTypeMetaId_fkey" FOREIGN KEY ("assetTypeMetaId") REFERENCES public.app_meta_config_ref(id) ON DELETE RESTRICT;


--
-- TOC entry 3859 (class 2606 OID 2895311)
-- Name: investments investments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT "investments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3860 (class 2606 OID 2895341)
-- Name: transactions transactions_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- TOC entry 3861 (class 2606 OID 2895356)
-- Name: transactions transactions_destinationAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "transactions_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES public.financial_accounts(id) ON DELETE SET NULL;


--
-- TOC entry 3862 (class 2606 OID 2895346)
-- Name: transactions transactions_goalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "transactions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES public.goals(id) ON DELETE SET NULL;


--
-- TOC entry 3863 (class 2606 OID 2895351)
-- Name: transactions transactions_sourceAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "transactions_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES public.financial_accounts(id) ON DELETE SET NULL;


--
-- TOC entry 3864 (class 2606 OID 2895336)
-- Name: transactions transactions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3870 (class 2606 OID 2895391)
-- Name: valuation_snapshots valuation_snapshots_investmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valuation_snapshots
    ADD CONSTRAINT "valuation_snapshots_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES public.investments(id) ON DELETE CASCADE;


--
-- TOC entry 3871 (class 2606 OID 2895386)
-- Name: valuation_snapshots valuation_snapshots_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valuation_snapshots
    ADD CONSTRAINT "valuation_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-09-20 19:41:51 IST

--
-- PostgreSQL database dump complete
--

\unrestrict AhN4XZzvbFVnpBQzVTBWSW5lWDwq4HqHCHJmb6eOGNiLpnLQqAcGF1IcFJoZf4C

