
import React, { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Stack } from "@mui/material";
import dayjs from "dayjs";
import Button from "./common/AppButton";
import AppDrawer from "./drawers/AppDrawer";
import {
  LabelCurrencyField,
  LabeledDateField,
  LabeledSelectField,
  LabeledTextareaField,
} from "./common";
import { getFinancialAccounts } from "../api/financialAccounts";
import {
  transactionSchema,
  createDefaultTransactionForm,
  toTransactionFormState,
} from "../validation/transactionSchema";

export default function AddTransactionModal({
  open,
  onClose,
  onSubmit,
  categories = [],
  goals = [],
  initialValues = null,
  title = "Add Transaction",
  submitLabel = "Save",
  submitError = "",
}) {
  const [sourceOptions, setSourceOptions] = useState([]);
  const [localSubmitError, setLocalSubmitError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: createDefaultTransactionForm(),
    mode: "onTouched",
  });

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category?.type === "income" || category?.type === "expense")
        .map((category) => ({ value: category.name, label: category.name })),
    [categories]
  );

  const categoryMetaByName = useMemo(
    () =>
      new Map(
        categories
          .filter(
            (category) =>
              category?.name && (category?.type === "income" || category?.type === "expense")
          )
          .map((category) => [category.name.trim().toLowerCase(), category])
      ),
    [categories]
  );

  const goalOptions = useMemo(
    () => [
      { value: "none", label: "No linked goal" },
      ...goals.map((goal) => ({
        value: goal._id || goal.id,
        label: goal.name || "Untitled Goal",
      })),
    ],
    [goals]
  );

  const applyIncomeDefaults = () => {
    const hasSalaryCategory = categoryOptions.some((option) => option.value === "Salary");
    const hdfcSource = sourceOptions.find((option) =>
      String(option.label || "").toLowerCase().includes("hdfc")
    );

    if (hasSalaryCategory) {
      setValue("category", "Salary", { shouldDirty: true, shouldValidate: true });
    }

    if (hdfcSource) {
      setValue("source", String(hdfcSource.value), { shouldDirty: true, shouldValidate: true });
    }
  };

  useEffect(() => {
    if (!open) return;

    let active = true;

    const loadAccounts = async () => {
      try {
        const accounts = await getFinancialAccounts();
        if (active) {
          setSourceOptions(
            (accounts || []).map((account) => ({
              value: String(account.id),
              label: account.displayName || account.institutionName || account.name,
            }))
          );
        }
      } catch (error) {
        void error;
        if (active) {
          setSourceOptions([]);
        }
      }
    };

    loadAccounts();

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    reset(toTransactionFormState(initialValues));
    setLocalSubmitError("");
  }, [open, initialValues, reset]);

  const submit = handleSubmit(async (values) => {
    setLocalSubmitError("");

    const normalizedCategoryName = values.category?.trim().toLowerCase();
    const matchedCategory = normalizedCategoryName
      ? categoryMetaByName.get(normalizedCategoryName)
      : undefined;

    const payload = {
      ...values,
      amount: Number(values.amount),
      category: values.category?.trim() || "",
      categoryId:
        matchedCategory?.id ||
        (initialValues?.category?.trim().toLowerCase() === normalizedCategoryName
          ? initialValues?.categoryId || null
          : null),
      date: dayjs(values.date).toDate(),
      source: values.source,
      goalId: values.goalId || null,
      notes: values.notes || "",
    };

    const result = await onSubmit?.(payload);
    if (typeof result === "string" && result.trim()) {
      setLocalSubmitError(result);
    }
  });

  const resolvedSubmitError = submitError || localSubmitError;

  const footer = (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5 }}>
      <Button type="button" variant="outlined" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" form="transaction-form" variant="contained">
        {submitLabel}
      </Button>
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Capture amount, type, category, bank source, and goal"
      footer={footer}
    >
      <Box component="form" id="transaction-form" noValidate onSubmit={submit}>
        <Stack spacing={1.5}>
          {resolvedSubmitError ? <Alert severity="error">{resolvedSubmitError}</Alert> : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(0, 1fr)" },
              gap: 1.5,
            }}
          >
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <LabeledSelectField
                  labelText="Type"
                  value={field.value || "expense"}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    field.onChange(nextType);

                    if (nextType === "income") {
                      applyIncomeDefaults();
                    }
                  }}
                  options={[
                    { value: "income", label: "Income" },
                    { value: "expense", label: "Expense" },
                  ]}
                  errorMessage={errors.type?.message}
                />
              )}
            />

            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <LabelCurrencyField
                  labelText="Amount"
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  placeholder="Enter amount"
                  errorMessage={errors.amount?.message}
                />
              )}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(0, 1fr)" },
              gap: 1.5,
            }}
          >
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <LabeledSelectField
                  labelText="Category"
                  value={field.value || ""}
                  onChange={(event) => field.onChange(event.target.value)}
                  options={categoryOptions}
                  errorMessage={errors.category?.message}
                />
              )}
            />

            <Controller
              name="source"
              control={control}
              render={({ field }) => (
                <LabeledSelectField
                  labelText="Bank / Source"
                  value={field.value || ""}
                  onChange={(event) => field.onChange(event.target.value)}
                  options={sourceOptions}
                  errorMessage={errors.source?.message}
                />
              )}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(0, 1fr)" },
              gap: 1.5,
            }}
          >
            <Controller
              name="goalId"
              control={control}
              render={({ field }) => (
                <LabeledSelectField
                  labelText="Goal"
                  value={field.value || "none"}
                  onChange={(event) => field.onChange(event.target.value === "none" ? "" : event.target.value)}
                  options={goalOptions}
                />
              )}
            />
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <LabeledDateField
                  labelText="Date"
                  value={field.value || null}
                  onChange={(value) => field.onChange(value)}
                  errorMessage={errors.date?.message}
                />
              )}
            />
          </Box>

          <LabeledTextareaField
            labelText="Notes"
            {...register("notes")}
            placeholder="Add any context for this transaction"
            minRows={4}
          />
        </Stack>
      </Box>
    </AppDrawer>
  );
}
