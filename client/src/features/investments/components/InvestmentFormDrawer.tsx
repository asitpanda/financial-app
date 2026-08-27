// @ts-nocheck
/** @typedef {import('../types/investment.types').InvestmentDrawerData} InvestmentDrawerData */
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { INVESTMENT_EVENT_TYPES, OPENING_INVESTMENT_EVENT_TYPES } from "../../../types/investmentEventTypes";
import {
  Alert,
  alpha,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import AppDrawer from "../../../components/drawers/AppDrawer";
import AppButton from "../../../components/common/AppButton";
import {
  LabelCurrencyField,
  LabeledDateField,
  LabeledSelectField,
  LabeledTextField,
  LabeledTextareaField,
  SectionCard,
} from "../../../components/common";
import {
  buildFormFromInvestment,
  createEmptyInvestmentForm,
  getInvestmentTypeDisplayLabel,
  getInvestmentTypeTreeItems,
  STATUS_OPTIONS,
} from "../../../utils/investmentHelpers";
import { validateInvestmentForm } from "../investment.schema";
import {
  cadenceToFrequency,
  DEFAULT_FREQUENCY,
  FREQUENCY_SELECT_OPTIONS,
} from "../../../utils/investmentHelpers";

const toDayjsOrNull = (value) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const getOpeningEventAmounts = (investment) => {
  const activePlanId = investment?.activeContributionPlan?.id;
  const confirmedOpeningEvents = (Array.isArray(investment?.investmentEvents)
    ? investment.investmentEvents
    : []
  ).filter((event) => {
    const status = String(event?.status || '').toUpperCase();
    if (status !== 'CONFIRMED') return false;
    if (activePlanId != null && String(event?.recurringPlanId ?? '') !== String(activePlanId)) {
      return false;
    }

    return OPENING_INVESTMENT_EVENT_TYPES.includes(event?.eventType);
  });

  return confirmedOpeningEvents.reduce(
    (acc, event) => {
      const amount = Number(event?.amount || 0);
      const eventType = event?.eventType;

      if (eventType === INVESTMENT_EVENT_TYPES.OPENING_BALANCE) {
        acc.openingPrincipalAmount += amount;
      }

      if (eventType === INVESTMENT_EVENT_TYPES.OPENING_INCOME_CREDIT) {
        acc.openingIncomeAmount += amount;
      }

      return acc;
    },
    { openingPrincipalAmount: 0, openingIncomeAmount: 0 },
  );
};

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onSubmit: (value: unknown) => unknown,
 *   initialValues?: InvestmentDrawerData | null,
 *   accounts?: unknown[],
 *   assetTypeConfigs?: unknown[],
 *   taxonomyNodes?: unknown[],
 *   title?: string,
 *   submitLabel?: string,
 *   submitError?: string,
 * }} props
 */
export default function InvestmentFormDrawer({
  open,
  onClose,
  onSubmit,
  initialValues = null,
  accounts = [],
  assetTypeConfigs = [],
  taxonomyNodes = [],
  title = "Add Investment",
  submitLabel = "Add",
  submitError = "",
}) {
  const [form, setForm] = useState(() => createEmptyInvestmentForm());
  const [errors, setErrors] = useState({});
  const [localSubmitError, setLocalSubmitError] = useState("");
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typePickerExpandedItems, setTypePickerExpandedItems] = useState([]);
  const [pendingTypeNodeId, setPendingTypeNodeId] = useState(null);
  const [contributionType, setContributionType] = useState("one-time");
  const [recurringPlan, setRecurringPlan] = useState({
    frequency: DEFAULT_FREQUENCY,
    amount: "",
    anchorDate: null,
    nextContributionDate: null,
    endDate: null,
    historicalImportMode: "TRACK_FROM_TODAY",
    openingPrincipalAmount: "",
    openingIncomeAmount: "",
  });
  const [pastInvestmentChoice, setPastInvestmentChoice] = useState("no");
  const [recurringErrors, setRecurringErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    const existingPlan = initialValues?.activeContributionPlan;
    const defaultHistoricalMode =
      existingPlan?.historicalImportMode || "TRACK_FROM_TODAY";
    const openingEventAmounts = getOpeningEventAmounts(initialValues);
    const seededOpeningPrincipalAmount =
      existingPlan?.openingPrincipalAmount !== undefined &&
      existingPlan?.openingPrincipalAmount !== null &&
      existingPlan?.openingPrincipalAmount !== ""
        ? String(existingPlan.openingPrincipalAmount)
        : openingEventAmounts.openingPrincipalAmount > 0
          ? String(openingEventAmounts.openingPrincipalAmount)
        : defaultHistoricalMode === "OPENING_BALANCE" &&
            Number(initialValues?.totalInvested || 0) > 0
          ? String(initialValues?.totalInvested)
          : "";

    setForm(
      initialValues
        ? buildFormFromInvestment(initialValues, taxonomyNodes)
        : createEmptyInvestmentForm(),
    );
    setErrors({});
    setRecurringErrors({});
    setLocalSubmitError("");
    setContributionType(existingPlan ? "recurring" : "one-time");
    setRecurringPlan({
      frequency: cadenceToFrequency(
        existingPlan?.cadenceUnit,
        existingPlan?.cadenceInterval,
      ),
      amount: existingPlan?.amount ? String(existingPlan.amount) : "",
      anchorDate: toDayjsOrNull(
        existingPlan?.anchorDate || initialValues?.startDate,
      ),
      nextContributionDate: toDayjsOrNull(existingPlan?.nextDueDate),
      endDate: toDayjsOrNull(existingPlan?.endDate),
      historicalImportMode: defaultHistoricalMode,
      openingPrincipalAmount: seededOpeningPrincipalAmount,
      openingIncomeAmount:
        openingEventAmounts.openingIncomeAmount > 0
          ? String(openingEventAmounts.openingIncomeAmount)
          : existingPlan?.openingIncomeAmount !== undefined &&
              existingPlan?.openingIncomeAmount !== null &&
              existingPlan?.openingIncomeAmount !== ""
            ? String(existingPlan.openingIncomeAmount)
            : "",
    });
    setPastInvestmentChoice(
      defaultHistoricalMode === "TRACK_FROM_TODAY" ? "no" : "yes",
    );
  }, [initialValues, open, taxonomyNodes]);

  useEffect(() => {
    if (!open) return;
    if (recurringPlan.historicalImportMode !== "OPENING_BALANCE") return;
    if (recurringPlan.openingPrincipalAmount) return;

    const seededOpeningPrincipalAmount = Number(form.totalInvested || 0);
    if (seededOpeningPrincipalAmount <= 0) return;

    setRecurringPlan((current) => {
      if (
        current.historicalImportMode !== "OPENING_BALANCE" ||
        current.openingPrincipalAmount
      ) {
        return current;
      }

      return {
        ...current,
        openingPrincipalAmount: String(seededOpeningPrincipalAmount),
      };
    });
  }, [
    form.totalInvested,
    initialValues?.activeContributionPlan,
    open,
    recurringPlan.historicalImportMode,
    recurringPlan.openingPrincipalAmount,
  ]);

  useEffect(() => {
    if (!open) return;
    setForm((current) => {
      if (current.type && current.category) return current;
      const firstType = Array.isArray(assetTypeConfigs) ? assetTypeConfigs[0] : null;
      const firstCategory = firstType?.categories?.[0] || null;
      if (!firstType || !firstCategory) return current;
      return {
        ...current,
        type: firstType.code,
        category: firstCategory.code,
      };
    });
  }, [assetTypeConfigs, open]);

  const investmentTypeTreeItems = useMemo(
    () => getInvestmentTypeTreeItems(taxonomyNodes),
    [taxonomyNodes],
  );
  const accountOptions = useMemo(() => {
    const mappedAccounts = (Array.isArray(accounts) ? accounts : []).map(
      (account) => ({
        value: String(account.id),
        label:
          account.displayName ||
          account.name ||
          account.institutionName ||
          `Account ${account.id}`,
      }),
    );

    return [{ value: "", label: "Select account" }, ...mappedAccounts];
  }, [accounts]);
  const investmentTypeRootIds = useMemo(
    () => investmentTypeTreeItems.map((item) => item.id),
    [investmentTypeTreeItems],
  );

  useEffect(() => {
    if (!typePickerOpen) return;
    setTypePickerExpandedItems(investmentTypeRootIds);
    setPendingTypeNodeId(
      form.assetTaxonomyId ? String(form.assetTaxonomyId) : null,
    );
  }, [form.assetTaxonomyId, investmentTypeRootIds, typePickerOpen]);

  const handleFormChange = (field, value) => {
    setForm((current) => {
      const nextForm = { ...current, [field]: value };
      if (field === "type") {
        const nextTypeConfig = assetTypeConfigs.find(
          (typeConfig) => String(typeConfig.code) === String(value),
        );
        const nextCategoryCodes = (nextTypeConfig?.categories || []).map(
          (categoryConfig) => String(categoryConfig.code),
        );
        if (!nextCategoryCodes.includes(String(current.category || ""))) {
          nextForm.category = nextTypeConfig?.categories?.[0]?.code || "";
        }
      }
      return nextForm;
    });

    setErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleSubmit = async () => {
    const validationErrors = validateInvestmentForm(form);
    if (!isRecurring && Number(form.totalInvested || 0) <= 0) {
      validationErrors.totalInvested =
        "Investment amount must be greater than 0";
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (contributionType === "recurring") {
      const nextRecurringErrors = {};
      if (!recurringPlan.amount || Number(recurringPlan.amount) <= 0) {
        nextRecurringErrors.amount = "Recurring amount must be greater than 0";
      }
      if (!recurringPlan.anchorDate) {
        nextRecurringErrors.anchorDate = "Anchor date is required";
      }
      if (!recurringPlan.historicalImportMode) {
        nextRecurringErrors.historicalImportMode =
          "Select historical import mode";
      }
      if (
        recurringPlan.historicalImportMode === "OPENING_BALANCE" &&
        Number(recurringPlan.openingPrincipalAmount || 0) <= 0 &&
        Number(recurringPlan.openingIncomeAmount || 0) <= 0
      ) {
        nextRecurringErrors.openingPrincipalAmount =
          "Provide opening principal and/or opening income amount";
      }
      if (Object.keys(nextRecurringErrors).length > 0) {
        setRecurringErrors(nextRecurringErrors);
        return;
      }
    }

    setLocalSubmitError("");
    const result = await onSubmit?.({
      ...form,
      contributionType,
      recurringPlan: contributionType === "recurring" ? recurringPlan : null,
    });
    if (typeof result === "string" && result.trim()) {
      setLocalSubmitError(result);
    }
  };

  const resolvedSubmitError = submitError || localSubmitError;

  const handleRecurringPlanChange = (field, value) => {
    setRecurringPlan((current) => ({ ...current, [field]: value }));
    setRecurringErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handlePastInvestmentChoiceChange = (choice) => {
    setPastInvestmentChoice(choice);
    setRecurringErrors((current) => {
      if (!current.historicalImportMode) return current;
      const next = { ...current };
      delete next.historicalImportMode;
      return next;
    });

    setRecurringPlan((current) => {
      if (choice === "no") {
        return {
          ...current,
          historicalImportMode: "TRACK_FROM_TODAY",
        };
      }

      return {
        ...current,
        historicalImportMode:
          current.historicalImportMode === "TRACK_FROM_TODAY"
            ? "OPENING_BALANCE"
            : current.historicalImportMode,
      };
    });
  };

  const handleSelectInvestmentType = (_, itemId) => {
    const nextItemId = Array.isArray(itemId) ? itemId[0] : itemId;
    if (!nextItemId) return;

    const selectedNode = taxonomyNodes.find(
      (node) => String(node.id) === String(nextItemId),
    );
    if (!selectedNode) return;

    const isLevelOneNode = Number(selectedNode.level) === 1;
    const hasActiveChildren = taxonomyNodes.some(
      (node) =>
        node?.isActive !== false &&
        String(node.parentId ?? "") === String(selectedNode.id),
    );
    if (isLevelOneNode && hasActiveChildren) return;

    setPendingTypeNodeId(String(nextItemId));
  };

  const handleConfirmInvestmentType = () => {
    if (!pendingTypeNodeId) return;

    const selectedNode = taxonomyNodes.find(
      (node) => String(node.id) === String(pendingTypeNodeId),
    );

    setForm((current) => {
      const nextForm = { ...current, assetTaxonomyId: pendingTypeNodeId };

      const defaultTypeConfig = assetTypeConfigs.find(
        (typeConfig) =>
          String(typeConfig.code) === String(selectedNode?.defaultAssetType || ""),
      );
      if (defaultTypeConfig) {
        nextForm.type = defaultTypeConfig.code;

        const defaultCategoryCodes = (defaultTypeConfig.categories || []).map(
          (categoryConfig) => String(categoryConfig.code),
        );
        nextForm.category = defaultCategoryCodes.includes(
          String(selectedNode.defaultAssetCategory || ""),
        )
          ? selectedNode.defaultAssetCategory
          : defaultTypeConfig.categories?.[0]?.code || "";
      } else {
        // No default hint on this bucket; force an explicit user choice.
        nextForm.type = "";
        nextForm.category = "";
      }

      return nextForm;
    });

    setErrors((current) => {
      if (!current.type && !current.category) return current;
      const nextErrors = { ...current };
      delete nextErrors.type;
      delete nextErrors.category;
      return nextErrors;
    });

    setTypePickerOpen(false);
    setPendingTypeNodeId(null);
  };

  const selectedTypeConfig = assetTypeConfigs.find(
    (typeConfig) => String(typeConfig.code) === String(form.type || ""),
  );
  const categoryOptions = [
    { value: "", label: "Select category" },
    ...(selectedTypeConfig?.categories || []).map((categoryConfig) => ({
      value: categoryConfig.code,
      label: categoryConfig.label,
    })),
  ];
  const currentBucketDisplayLabel = getInvestmentTypeDisplayLabel(
    form.assetTaxonomyId,
    taxonomyNodes,
  );
  const isInsurance = String(form.type || "") === "INSURANCE";
  const selectedCategoryConfig = selectedTypeConfig?.categories?.find(
    (categoryConfig) => String(categoryConfig.code) === String(form.category || ""),
  );
  const isInsuranceSavings =
    selectedCategoryConfig?.accountingTreatment === "INSURANCE_SAVINGS";
  const referenceLabel = isInsurance
    ? "Policy Number"
    : ["MUTUAL_FUND", "DEBT_MUTUAL_FUND", "INDEX_FUND"].includes(
          String(form.category || ""),
        )
      ? "Folio Number"
      : ["STOCK", "ETF"].includes(String(form.category || ""))
        ? "Demat / ISIN Reference"
        : "Account / Certificate Reference";
  const assetTypeOptions = [
    { value: "", label: "Select type" },
    ...assetTypeConfigs.map((typeConfig) => ({
      value: typeConfig.code,
      label: typeConfig.label,
    })),
  ];

  const contributionChoices = [
    {
      value: "one-time",
      title: "One-time Investment",
      description:
        "Use a single entry for FD, bond, lump-sum mutual fund, stock purchase, or gold allocation.",
    },
    {
      value: "recurring",
      title: "Recurring Contribution",
      description:
        "Create an active recurring plan and optional historical contribution import right after investment creation.",
    },
  ];

  const isRecurring = contributionType === "recurring";
  const hasExistingActiveRecurringPlan = Boolean(
    initialValues?.activeContributionPlan,
  );
  const isHistoricalImportLocked =
    isRecurring && hasExistingActiveRecurringPlan;
  const isOpeningBalanceMode =
    recurringPlan.historicalImportMode === "OPENING_BALANCE";
  const showHistoricalModeSelector =
    isRecurring && pastInvestmentChoice === "yes";
  const showOpeningInputs = showHistoricalModeSelector && isOpeningBalanceMode;
  const seedPrincipalAmount = Number(form.totalInvested || 0);
  const openingPrincipalAmount = Number(
    recurringPlan.openingPrincipalAmount || 0,
  );
  const openingIncomeAmount = Number(recurringPlan.openingIncomeAmount || 0);
  const shouldShowOpeningSeedGuardrail =
    showOpeningInputs && seedPrincipalAmount > 0 && openingPrincipalAmount > 0;
  const isHistoricalOneTimeInvestment =
    !isRecurring &&
    Boolean(form.startDate) &&
    dayjs(form.startDate).isValid() &&
    dayjs(form.startDate).isBefore(dayjs(), "day");
  const oneTimeAmountHelperText = isHistoricalOneTimeInvestment
    ? "Enter the historical one-time amount invested on the selected start date."
    : "Enter the one-time amount invested for this asset.";
  const historicalImportLockedMessage =
    "You can’t change historical import for an active recurring plan from this edit flow. Historical setup is only available when creating a new plan.";

  const impactSummary = useMemo(() => {
    if (!isRecurring) return [];

    const summary = [
      "Will create recurring plan from the selected anchor date.",
    ];

    if (pastInvestmentChoice === "no") {
      summary.push("Will not backfill past history.");
      return summary;
    }

    if (recurringPlan.historicalImportMode === "TRACK_FROM_TODAY") {
      summary.push("Will not backfill past history.");
      return summary;
    }

    if (recurringPlan.historicalImportMode === "OPENING_BALANCE") {
      summary.push(
        openingPrincipalAmount > 0
          ? "Will create 1 opening principal event."
          : "Will not create opening principal event unless amount is entered.",
      );
      summary.push(
        openingIncomeAmount > 0
          ? "Will create 1 opening income event."
          : "Will not create opening income event unless amount is entered.",
      );
      summary.push("Will not backfill monthly installments for past dates.");
      return summary;
    }

    return summary;
  }, [
    isRecurring,
    openingIncomeAmount,
    openingPrincipalAmount,
    pastInvestmentChoice,
    recurringPlan.historicalImportMode,
  ]);

  // Display helpers: clear valuation inputs when historical import is enabled
  const displayTotalInvested =
    isRecurring && pastInvestmentChoice === 'yes' ? '' : form.totalInvested;
  const displayCurrentValue =
    isRecurring && pastInvestmentChoice === 'yes' ? '' : form.currentValue;

  const footer = (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}>
      <AppButton variant="outlined" onClick={onClose} sx={{ minWidth: 120 }}>
        Cancel
      </AppButton>
      <AppButton
        variant="contained"
        onClick={handleSubmit}
        sx={{ minWidth: 160 }}
      >
        {submitLabel}
      </AppButton>
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Capture the operational details needed to manage this investment end-to-end."
      width={760}
      footer={footer}
    >
      <Stack spacing={2.25}>
        {resolvedSubmitError ? (
          <Alert severity="error">{resolvedSubmitError}</Alert>
        ) : null}

        <SectionCard
          title="Investment Setup"
          subtitle="Keep the drawer on one screen, but shape the top of the form like the wireframe so type and contribution decisions happen first."
        >
          <Stack spacing={2}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.75,
                borderRadius: 1,
                borderColor: errors.type ? "error.main" : "divider",
                background: (theme) =>
                  currentBucketDisplayLabel
                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${theme.palette.background.paper} 100%)`
                    : theme.palette.background.paper,
              }}
            >
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  <LabeledSelectField
                    labelText="Asset Type"
                    value={form.type}
                    onChange={(event) =>
                      handleFormChange("type", event.target.value)
                    }
                    options={assetTypeOptions}
                    errorMessage={errors.type}
                    helperText={
                      assetTypeOptions.length > 1
                        ? "Server-owned investment types."
                        : "No investment metadata loaded yet."
                    }
                  />
                  <LabeledSelectField
                    labelText="Asset Category"
                    value={form.category}
                    onChange={(event) =>
                      handleFormChange("category", event.target.value)
                    }
                    options={categoryOptions}
                    errorMessage={errors.category}
                    helperText={
                      selectedTypeConfig
                        ? "Categories are filtered by the selected asset type."
                        : "Select an asset type first."
                    }
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      Bucket / Taxonomy
                    </Typography>
                    <Typography sx={{ fontWeight: 700, mt: 0.35 }}>
                      {currentBucketDisplayLabel || "Optional organizational bucket"}
                    </Typography>
                    {!investmentTypeTreeItems.length ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        No asset taxonomy is available yet. Type and category still work without it.
                      </Typography>
                    ) : null}
                  </Box>
                  <AppButton
                    variant="outlined"
                    onClick={() => setTypePickerOpen(true)}
                    disabled={!investmentTypeTreeItems.length}
                  >
                    Choose Bucket
                  </AppButton>
                </Box>
              </Stack>
            </Paper>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                },
                gap: 1.5,
              }}
            >
              {contributionChoices.map((choice) => {
                const selected = contributionType === choice.value;

                return (
                  <Paper
                    key={choice.value}
                    variant="outlined"
                    onClick={() => setContributionType(choice.value)}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      cursor: "pointer",
                      borderColor: selected ? "primary.main" : "divider",
                      backgroundColor: (theme) =>
                        selected
                          ? alpha(theme.palette.primary.main, 0.06)
                          : theme.palette.background.paper,
                      transition:
                        "border-color 120ms ease, background-color 120ms ease, transform 120ms ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    <Stack spacing={0.75}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                        }}
                      >
                        <Typography sx={{ fontWeight: 700 }}>
                          {choice.title}
                        </Typography>
                        <Box
                          sx={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            border: "2px solid",
                            borderColor: selected ? "primary.main" : "divider",
                            backgroundColor: selected
                              ? "primary.main"
                              : "transparent",
                          }}
                        />
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ lineHeight: 1.6 }}
                      >
                        {choice.description}
                      </Typography>
                    </Stack>
                  </Paper>
                );
              })}
            </Box>
          </Stack>
        </SectionCard>

        <SectionCard
          title="Investment Details"
          subtitle="These fields belong to the investment record itself."
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            <LabeledSelectField
              labelText="Funding Account"
              value={String(form.accountId ?? "")}
              onChange={(event) =>
                handleFormChange("accountId", event.target.value)
              }
              options={accountOptions}
              errorMessage={errors.accountId}
              helperText={
                accountOptions.length <= 1
                  ? "Create a financial account first."
                  : ""
              }
            />
            <LabeledTextField
              labelText="Investment Name"
              value={form.name}
              onChange={(event) => handleFormChange("name", event.target.value)}
              errorMessage={errors.name}
            />
            <LabeledTextField
              labelText="Institution"
              value={form.institution}
              onChange={(event) =>
                handleFormChange("institution", event.target.value)
              }
              errorMessage={errors.institution}
            />
            <LabeledDateField
              labelText="Start Date"
              value={form.startDate}
              onChange={(value) => handleFormChange("startDate", value)}
              errorMessage={errors.startDate}
            />
            <LabeledSelectField
              labelText="Status"
              value={form.status}
              onChange={(event) =>
                handleFormChange("status", event.target.value)
              }
              options={STATUS_OPTIONS.filter(
                (option) => option.value !== "all",
              )}
            />
            <LabeledTextField
              labelText={referenceLabel}
              value={form.referenceNumber}
              onChange={(event) =>
                handleFormChange("referenceNumber", event.target.value)
              }
            />
          </Box>
        </SectionCard>

        <SectionCard
          title="Investment Valuation"
          subtitle="These fields belong to the investment record and describe value only; they do not create recurring-plan history."
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            <LabelCurrencyField
              labelText={
                isRecurring
                  ? "Initial Principal (Seed Value)"
                  : isInsuranceSavings
                    ? "Premium Paid"
                    : "Investment Amount"
              }
              value={displayTotalInvested}
              onValueChange={(value) => handleFormChange("totalInvested", value)}
              errorMessage={errors.totalInvested}
              helperText={
                isRecurring
                  ? "System-calculated from confirmed historical events."
                  : oneTimeAmountHelperText
              }
              disabled={isRecurring}
            />
            <LabelCurrencyField
              labelText={isInsuranceSavings ? "Current Value (Optional)" : "Current Value"}
              value={displayCurrentValue}
              onValueChange={(value) => handleFormChange("currentValue", value)}
              helperText={
                isInsuranceSavings
                  ? "Optional policy value; excluded from portfolio return totals."
                  : "System-calculated from valuation import/history."
              }
              disabled={!isInsuranceSavings}
            />
            <LabeledDateField
              labelText={isInsurance ? "Policy Term End Date (Optional)" : "Maturity Date (Optional)"}
              value={form.maturityDate}
              onChange={(value) => handleFormChange("maturityDate", value)}
            />
            {isInsurance ? (
              <LabelCurrencyField
                labelText="Insurance Cover"
                value={form.insuranceCover}
                onValueChange={(value) =>
                  handleFormChange("insuranceCover", value)
                }
              />
            ) : null}
          </Box>
          {shouldShowOpeningSeedGuardrail ? (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              Opening Principal will be used for historical principal tracking
              after confirm. Keep seed and opening principal aligned to avoid
              confusion.
            </Alert>
          ) : null}
        </SectionCard>

        {isRecurring ? (
          <SectionCard
            title="Recurring Plan"
            subtitle="These fields update the recurring contribution plan attached to this investment."
          >
            <Stack spacing={1.5}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Are you already invested in this asset?
                </Typography>
                {isHistoricalImportLocked ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.75 }}
                  >
                    {historicalImportLockedMessage}
                  </Typography>
                ) : null}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 1,
                    mt: 1,
                  }}
                >
                  {[
                    {
                      value: "yes",
                      title: "Yes, I already have past investment",
                    },
                    {
                      value: "no",
                      title: "No, I am starting now",
                    },
                  ].map((option) => {
                    const selected = pastInvestmentChoice === option.value;
                    return (
                      <Paper
                        key={option.value}
                        variant="outlined"
                        onClick={
                          isHistoricalImportLocked
                            ? undefined
                            : () =>
                                handlePastInvestmentChoiceChange(option.value)
                        }
                        sx={{
                          p: 1.25,
                          borderRadius: 1,
                          cursor: isHistoricalImportLocked
                            ? "not-allowed"
                            : "pointer",
                          borderColor: selected ? "primary.main" : "divider",
                          backgroundColor: (theme) =>
                            selected
                              ? alpha(theme.palette.primary.main, 0.06)
                              : theme.palette.background.paper,
                          opacity: isHistoricalImportLocked ? 0.72 : 1,
                        }}
                      >
                        <Typography sx={{ fontWeight: 600 }}>
                          {option.title}
                        </Typography>
                      </Paper>
                    );
                  })}
                </Box>
              </Paper>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 1.5,
                }}
              >
                <LabelCurrencyField
                  labelText="Recurring Amount"
                  value={recurringPlan.amount}
                  onValueChange={(value) =>
                    handleRecurringPlanChange("amount", value)
                  }
                  errorMessage={recurringErrors.amount}
                />
                <LabeledSelectField
                  labelText="Frequency"
                  value={recurringPlan.frequency}
                  onChange={(event) =>
                    handleRecurringPlanChange("frequency", event.target.value)
                  }
                  options={FREQUENCY_SELECT_OPTIONS}
                />
                <LabeledDateField
                  labelText="Anchor Date"
                  value={recurringPlan.anchorDate}
                  onChange={(value) =>
                    handleRecurringPlanChange("anchorDate", value)
                  }
                  errorMessage={recurringErrors.anchorDate}
                />
                <LabeledDateField
                  labelText="Next Contribution Date (Optional)"
                  value={recurringPlan.nextContributionDate}
                  onChange={(value) =>
                    handleRecurringPlanChange("nextContributionDate", value)
                  }
                />
                <LabeledDateField
                  labelText={
                    isInsuranceSavings
                      ? "Premium Pay Term End Date (Optional)"
                      : "Plan End Date (Optional)"
                  }
                  value={recurringPlan.endDate}
                  onChange={(value) =>
                    handleRecurringPlanChange("endDate", value)
                  }
                />
              </Box>

              {showHistoricalModeSelector ? (
                <LabeledSelectField
                  labelText="Historical Import Mode"
                  value={recurringPlan.historicalImportMode}
                  onChange={(event) =>
                    handleRecurringPlanChange(
                      "historicalImportMode",
                      event.target.value,
                    )
                  }
                  options={[
                    {
                      value: "TRACK_FROM_TODAY",
                      label: "Start from Today (No Backfill)",
                    },
                    {
                      value: "OPENING_BALANCE",
                      label: "Import Opening Balance (Principal/Income)",
                    },
                  ]}
                  errorMessage={recurringErrors.historicalImportMode}
                  helperText={
                    isHistoricalImportLocked
                      ? historicalImportLockedMessage
                      : "Controls how historical contribution events are created during recurring plan confirm."
                  }
                  disabled={isHistoricalImportLocked}
                />
              ) : (
                <Alert severity="info">
                  History import is off. The plan will start from today with no
                  backfill.
                </Alert>
              )}

              {/* Historical generation/review modes removed — only TRACK_FROM_TODAY and OPENING_BALANCE supported */}

              {showOpeningInputs ? (
                <>
                  <Alert severity="info">
                    Opening amounts create historical events directly: principal
                    as OPENING_BALANCE and profit as OPENING_INCOME_CREDIT.
                  </Alert>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "repeat(2, minmax(0, 1fr))",
                      },
                      gap: 1.5,
                    }}
                  >
                    <LabelCurrencyField
                      labelText="Opening Principal Amount"
                      value={recurringPlan.openingPrincipalAmount}
                      onValueChange={(value) =>
                        handleRecurringPlanChange(
                          "openingPrincipalAmount",
                          value,
                        )
                      }
                      errorMessage={recurringErrors.openingPrincipalAmount}
                      helperText="Creates OPENING_BALANCE historical event and contributes to invested principal."
                      disabled={isHistoricalImportLocked}
                    />
                    <LabelCurrencyField
                      labelText="Opening Income/Profit Amount"
                      value={recurringPlan.openingIncomeAmount}
                      onValueChange={(value) =>
                        handleRecurringPlanChange("openingIncomeAmount", value)
                      }
                      helperText="Creates OPENING_INCOME_CREDIT historical event for return history (not principal)."
                      disabled={isHistoricalImportLocked}
                    />
                  </Box>
                </>
              ) : null}

              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  What will happen
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  {impactSummary.map((line) => (
                    <Typography
                      key={line}
                      variant="body2"
                      color="text.secondary"
                    >
                      • {line}
                    </Typography>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </SectionCard>
        ) : null}

        <SectionCard title="Notes">
          <LabeledTextareaField
            labelText="Internal Notes"
            value={form.notes}
            onChange={(event) => handleFormChange("notes", event.target.value)}
            helperText="Use this for action reminders, nominee context, or maturity instructions."
          />
        </SectionCard>
      </Stack>

      <Dialog
        open={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>Select Taxonomy Bucket</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose any non-root node from the asset taxonomy hierarchy. If the
              bucket has a default asset type/category hint, it will update
              those fields below.
            </Typography>
            <Paper
              variant="outlined"
              sx={{ borderRadius: 1, overflow: "hidden" }}
            >
              <RichTreeView
                items={investmentTypeTreeItems}
                getItemId={(item) => item.id}
                getItemLabel={(item) => item.label}
                getItemChildren={(item) => item.children || []}
                selectedItems={pendingTypeNodeId || undefined}
                expandedItems={typePickerExpandedItems}
                onSelectedItemsChange={handleSelectInvestmentType}
                onExpandedItemsChange={(_, itemIds) =>
                  setTypePickerExpandedItems(itemIds)
                }
                expansionTrigger="iconContainer"
                sx={{
                  px: 1,
                  py: 1,
                  minHeight: 360,
                  maxHeight: 440,
                  overflowY: "auto",
                  "& .MuiTreeItem-content": {
                    borderRadius: 1,
                    mx: 0.5,
                    my: 0.25,
                    py: 0.5,
                  },
                  "& .MuiTreeItem-content.Mui-selected": {
                    backgroundColor: (theme) =>
                      alpha(theme.palette.primary.main, 0.12),
                  },
                  "& .MuiTreeItem-content.Mui-selected:hover": {
                    backgroundColor: (theme) =>
                      alpha(theme.palette.primary.main, 0.16),
                  },
                }}
              />
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <AppButton
            variant="outlined"
            onClick={() => setTypePickerOpen(false)}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            onClick={handleConfirmInvestmentType}
            disabled={!pendingTypeNodeId}
          >
            Use Selected Bucket
          </AppButton>
        </DialogActions>
      </Dialog>
    </AppDrawer>
  );
}
