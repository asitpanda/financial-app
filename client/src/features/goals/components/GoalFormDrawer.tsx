// @ts-nocheck
import React, { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Step,
  StepLabel,
  Stepper,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import Button from "../../../components/common/AppButton";
import dayjs from "dayjs";
import Icon from "@mdi/react";
import {
  LabeledAutocompleteField,
  LabeledDateField,
  LabeledTextField,
} from "../../../components/common";
import LabelCurrencyField from "../../../components/common/LabelCurrencyField";
import LabeledTextareaField from "../../../components/common/LabeledTextareaField";
import { useCategories } from "../../categories/useCategories";
import {
  goalSchema,
  createDefaultGoalForm,
  toGoalFormState,
} from "../goals.schema";
import { CATEGORY_ICON_OPTIONS } from "../../../constants/categoryIcons";
import AppDrawer from "../../../components/drawers/AppDrawer";
import { useDrawerStore } from "../../../store/drawerStore";
import { patchDrawer } from "../../../services/navigation";

const DEFAULT_GOAL_ICON = "gift";

export default function GoalFormDrawer({
  open,
  onClose,
  onSubmit,
  initialValues = null,
  title = "Add Goal",
  submitLabel = "Add",
  submitError = "",
}) {
  const [localSubmitError, setLocalSubmitError] = React.useState("");
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: createDefaultGoalForm(),
    mode: "onTouched",
  });

  const drawerStep = useDrawerStore((state) => state.step);
  const drawerMode = useDrawerStore((state) => state.mode);
  const isReviewStep = drawerStep === "review";
  const activeStep = isReviewStep ? 1 : 0;
  const modeLabel = drawerMode === "edit" ? "Update Goal" : "Create Goal";
  const reviewValues = watch();
  const { data: categories = [] } = useCategories();

  const categoryOptions = useMemo(() => {
    const names = categories
      .filter((category) => category?.type === "goal")
      .map((category) => category.name)
      .filter(Boolean);
    return [
      ...new Set(["Personal", ...names, reviewValues.category].filter(Boolean)),
    ];
  }, [categories, reviewValues.category]);

  const categoryMetaByName = useMemo(
    () =>
      new Map(
        categories
          .filter((category) => category?.name && category?.type === "goal")
          .map((category) => [category.name.trim().toLowerCase(), category]),
      ),
    [categories],
  );

  useEffect(() => {
    if (!open) return;
    reset(toGoalFormState(initialValues));
    setLocalSubmitError("");
  }, [open, initialValues, reset]);

  const submit = handleSubmit(async (values) => {
    setLocalSubmitError("");
    const normalizedCategoryName = values.category?.trim().toLowerCase();
    const matchedCategory = normalizedCategoryName
      ? categoryMetaByName.get(normalizedCategoryName)
      : undefined;

    const result = await onSubmit?.({
      name: values.name.trim(),
      category: values.category.trim(),
      categoryId:
        matchedCategory?.id ||
        (initialValues?.category?.trim().toLowerCase() ===
        normalizedCategoryName
          ? initialValues?.categoryId || null
          : null),
      description: values.description?.trim() || undefined,
      icon: matchedCategory?.icon || values.icon || DEFAULT_GOAL_ICON,
      targetAmount: Number(values.targetAmount),
      currentAmount: values.currentAmount ?? 0,
      deadline: values.deadline
        ? dayjs(values.deadline).toISOString()
        : undefined,
    });

    if (typeof result === "string" && result.trim()) {
      setLocalSubmitError(result);
    }
  });

  const resolvedSubmitError = submitError || localSubmitError;

  const handleContinueToReview = async () => {
    const valid = await trigger();
    if (!valid) return;
    patchDrawer({ step: "review" });
  };

  const handleBackToDetails = () => {
    patchDrawer({ step: "form" });
  };

  const footer = (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      {isReviewStep ? (
        <Button type="button" variant="outlined" onClick={handleBackToDetails}>
          Back
        </Button>
      ) : (
        <Button type="button" variant="outlined" onClick={onClose}>
          Cancel
        </Button>
      )}
      {isReviewStep ? (
        <Button type="button" variant="contained" onClick={submit}>
          {submitLabel}
        </Button>
      ) : (
        <Button
          type="button"
          variant="contained"
          onClick={handleContinueToReview}
        >
          Next: Review
        </Button>
      )}
    </Box>
  );

  const selectedCategoryMeta = categoryMetaByName.get(
    reviewValues.category?.trim().toLowerCase(),
  );
  const selectedIconMeta =
    CATEGORY_ICON_OPTIONS.find(
      (item) => item.value === selectedCategoryMeta?.icon,
    ) ||
    CATEGORY_ICON_OPTIONS.find((item) => item.value === reviewValues.icon) ||
    CATEGORY_ICON_OPTIONS.find((item) => item.value === DEFAULT_GOAL_ICON) ||
    CATEGORY_ICON_OPTIONS[0];

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={
        isReviewStep
          ? `${modeLabel} - Review`
          : "Capture category, amount, date, and notes"
      }
      footer={footer}
    >
      <Box
        sx={{
          mb: 2.5,
          "& .MuiStepConnector-line": {
            borderColor: "divider",
            borderTopWidth: 2,
          },
          "& .MuiStepIcon-root": {
            color: "#808997",
            border: "2px solid",
            borderColor: "divider",
            borderRadius: "50%",
            fontSize: 24,
          },
          "& .MuiStepIcon-text": {
            fontSize: 18,
            fontWeight: "bold",
          },
          "& .MuiStepIcon-root.Mui-active": {
            color: "success.main",
            borderColor: "success.main",
          },
          "& .MuiStepIcon-root.Mui-completed": {
            color: "info.main",
            borderColor: "info.main",
          },
          "& .MuiStepLabel-label": {
            fontSize: 13,
            fontWeight: 600,
            color: "text.secondary",
          },
          "& .MuiStepLabel-label.Mui-active": {
            color: "success.main",
          },
          "& .MuiStepLabel-label.Mui-completed": {
            color: "info.main",
          },
        }}
      >
        <Stepper activeStep={activeStep} alternativeLabel>
          <Step>
            <StepLabel>Details</StepLabel>
          </Step>
          <Step>
            <StepLabel>Review</StepLabel>
          </Step>
        </Stepper>
      </Box>

      {isReviewStep ? (
        <Stack spacing={2}>
          {resolvedSubmitError ? (
            <Alert severity="error">{resolvedSubmitError}</Alert>
          ) : null}

          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 0.5,
              p: 2,
              display: "grid",
              gap: 1.75,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 24 }}>
                Review Goal Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please review your goal details before{" "}
                {drawerMode === "edit" ? "updating" : "creating"}.
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography
                variant="caption"
                sx={{ width: "100px" }}
                color="text.secondary"
              >
                Goal Name
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 400, textAlign: "left" }}
              >
                {reviewValues.name || "-"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography
                variant="caption"
                sx={{ width: "100px" }}
                color="text.secondary"
              >
                Goal Category
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 400, textAlign: "left" }}
              >
                {reviewValues.category || "-"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography
                variant="caption"
                sx={{ width: "100px" }}
                color="text.secondary"
              >
                Target Amount
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 400, textAlign: "left" }}
              >
                ₹{Number(reviewValues.targetAmount || 0).toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography
                variant="caption"
                sx={{ width: "100px" }}
                color="text.secondary"
              >
                Target Date
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 400, textAlign: "left" }}
              >
                {reviewValues.deadline
                  ? dayjs(reviewValues.deadline).format("DD MMM YYYY")
                  : "Not set"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
              <Typography
                variant="caption"
                sx={{ width: "100px" }}
                color="text.secondary"
              >
                Description
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 400, textAlign: "left", maxWidth: "65%" }}
              >
                {reviewValues.description || "Not added"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography
                variant="caption"
                sx={{ width: "100px" }}
                color="text.secondary"
              >
                Initial Amount
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 400, textAlign: "left" }}
              >
                ₹{Number(reviewValues.currentAmount || 0).toLocaleString()}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "50%",
              alignSelf: "center",
              width: 68,
              height: 68,
              mx: "auto",
              bgcolor: "success.50",
              border: "1px solid",
              borderColor: "success.100",
            }}
          >
            <Icon path={selectedIconMeta.path} size={2.0} color="#16a34a" />
          </Box>
        </Stack>
      ) : (
        <Box
          component="form"
          id="goal-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            handleContinueToReview();
          }}
        >
          <Stack spacing={1.5}>
            {resolvedSubmitError ? (
              <Alert severity="error">{resolvedSubmitError}</Alert>
            ) : null}

            <LabeledTextField
              labelText="Name"
              {...register("name")}
              placeholder="Enter goal name"
              errorMessage={errors.name?.message}
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "minmax(0, 1fr) minmax(0, 1fr)",
                },
                gap: 1.5,
              }}
            >
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <LabeledAutocompleteField
                    labelText="Category"
                    options={categoryOptions}
                    value={field.value || null}
                    isOptionEqualToValue={(option, value) => option === value}
                    getOptionLabel={(option) => option}
                    onChange={(_, option) => {
                      field.onChange(option || "");
                    }}
                    placeholder="Select goal category"
                    errorMessage={errors.category?.message}
                  />
                )}
              />

              <Controller
                name="targetAmount"
                control={control}
                render={({ field }) => (
                  <LabelCurrencyField
                    labelText="Target Amount"
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder="Enter target amount"
                    errorMessage={errors.targetAmount?.message}
                  />
                )}
              />
            </Box>

            <Box sx={{ maxWidth: { xs: "100%", sm: 280 } }}>
              <Controller
                name="deadline"
                control={control}
                render={({ field }) => (
                  <LabeledDateField
                    labelText="Target Date"
                    value={field.value || null}
                    onChange={(value) => field.onChange(value)}
                    errorMessage={errors.deadline?.message}
                  />
                )}
              />
            </Box>

            <LabeledTextareaField
              labelText="Description (Optional)"
              {...register("description")}
              placeholder="Add a short note for this goal"
              minRows={3}
            />

            <Box sx={{ maxWidth: { xs: "100%", sm: 280 } }}>
              <Controller
                name="currentAmount"
                control={control}
                render={({ field }) => (
                  <LabelCurrencyField
                    labelText="Initial Amount (Optional)"
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder="Enter initial amount"
                    errorMessage={errors.currentAmount?.message}
                  />
                )}
              />
            </Box>
          </Stack>
        </Box>
      )}
    </AppDrawer>
  );
}
