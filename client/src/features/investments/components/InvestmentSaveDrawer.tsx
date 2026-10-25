import React, { useState } from "react";
import { Alert, Typography } from "@mui/material";
import AppButton from "../../../components/common/AppButton";
import AppDrawer from "../../../components/drawers/AppDrawer";
import { useNotificationStore } from "../../../store/notificationStore";
import { getRuntimeErrorMessage } from "../../../utils/errorMessage";
import {
  buildInvestmentFromForm,
  buildRecurringConfirmPayload,
  buildRecurringPlanUpdatePayloadFromFormValues,
  buildRecurringReviewState,
} from "../../../utils/investmentHelpers";
import { useInvestmentReferenceData, useSaveInvestment } from "../hooks/useInvestments";
import type { CreateInvestmentDto, InvestmentDrawerData } from "../types/investment.types";
import InvestmentFormDrawer from "./InvestmentFormDrawer";
import RecurringOccurrencesReviewDialog from "./RecurringOccurrencesReviewDialog";

interface InvestmentSaveDrawerProps {
  onClose: () => void;
  onSaved?: () => void;
  initialValues?: InvestmentDrawerData | null;
}

export default function InvestmentSaveDrawer({
  onClose,
  onSaved,
  initialValues = null,
}: InvestmentSaveDrawerProps) {
  const referenceData = useInvestmentReferenceData();
  const saveInvestment = useSaveInvestment();
  const pushNotification = useNotificationStore((state) => state.pushNotification);
  const [pendingReview, setPendingReview] = useState<ReturnType<typeof buildRecurringReviewState> | null>(null);
  const selectedInvestmentId = initialValues?.id ?? null;
  const editing = selectedInvestmentId != null;

  const close = () => {
    if (saveInvestment.isPending) return;
    onClose();
  };

  const completeSave = (message: string) => {
    pushNotification({ type: "success", message });
    onSaved?.();
    onClose();
  };

  const submit = async (formValues: Parameters<typeof buildInvestmentFromForm>[0]) => {
    const investmentPayload = buildInvestmentFromForm(
      formValues,
      selectedInvestmentId,
      referenceData.taxonomyNodes,
      referenceData.accounts,
    ) as CreateInvestmentDto;

    if (formValues?.contributionType === "recurring") {
      setPendingReview(buildRecurringReviewState({
        formValues,
        nextInvestment: investmentPayload,
        drawerMode: editing ? "edit" : "create",
        selectedInvestmentId,
        selectedInvestment: initialValues,
      }));
      return null;
    }

    try {
      await saveInvestment.mutateAsync({ payload: investmentPayload, selectedInvestmentId });
      completeSave(editing ? "Investment updated" : "Investment added");
      return null;
    } catch (error) {
      return getRuntimeErrorMessage(error, editing ? "Failed to update investment" : "Failed to add investment");
    }
  };

  const confirmRecurring = async () => {
    if (!pendingReview || saveInvestment.isPending) return;

    try {
      const payload = {
        ...pendingReview.investmentPayload,
        ...(pendingReview.alreadyHasActivePlan ? {
          recurringPlanId: Number(pendingReview.activePlanId),
          recurringPlanUpdate: buildRecurringPlanUpdatePayloadFromFormValues(
            pendingReview.formValues,
            initialValues?.activeContributionPlan,
          ),
        } : {
          recurringPlan: buildRecurringConfirmPayload(
            pendingReview.recurringPayload,
            pendingReview.reviewedHistoricalItems,
          ),
        }),
      } as CreateInvestmentDto;
      await saveInvestment.mutateAsync({ payload, selectedInvestmentId });
      completeSave(editing ? "Investment updated and recurring plan confirmed" : "Investment and recurring plan created");
    } catch (error) {
      pushNotification({
        type: "error",
        message: getRuntimeErrorMessage(error, "Failed to save investment and recurring plan"),
      });
    }
  };

  if (!referenceData.ready) {
    return (
      <AppDrawer open onClose={close} title={editing ? "Edit Investment" : "Add Investment"}>
        {referenceData.error ? (
          <Alert severity="error" action={<AppButton size="small" onClick={() => referenceData.reload()}>Retry</AppButton>}>
            Failed to load investment form data.
          </Alert>
        ) : <Typography color="text.secondary">Loading investment form...</Typography>}
      </AppDrawer>
    );
  }

  return (
    <>
      <InvestmentFormDrawer
        open
        onClose={close}
        onSubmit={submit}
        initialValues={initialValues}
        accounts={referenceData.accounts}
        assetTypeConfigs={referenceData.assetTypeConfigs}
        taxonomyNodes={referenceData.taxonomyNodes}
        title={editing ? "Edit Investment" : "Add Investment"}
        submitLabel={editing ? "Update" : "Add"}
      />
      <RecurringOccurrencesReviewDialog
        open={Boolean(pendingReview)}
        loading={saveInvestment.isPending}
        items={pendingReview?.reviewedHistoricalItems || []}
        historicalImportMode={pendingReview?.historicalImportMode}
        investmentName={pendingReview?.investmentName}
        reviewSummary={pendingReview?.reviewSummary}
        dialogTitle={editing ? "Review Investment Update" : "Review Investment Setup"}
        onCancel={() => { if (!saveInvestment.isPending) setPendingReview(null); }}
        onConfirm={confirmRecurring}
        confirmLabel={editing ? "Confirm Changes" : "Confirm and Create"}
      />
    </>
  );
}