import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Stack } from "@mui/material";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import Button from "../../../components/common/AppButton";
import AppDrawer from "../../../components/drawers/AppDrawer";
import {
  LabelCurrencyField,
  LabeledDateField,
  LabeledSelectField,
  LabeledTextareaField,
} from "../../../components/common";
import { getFinancialAccounts } from "../../accounts/financialAccounts.api";
import {
  transactionSchema,
  createDefaultTransactionForm,
  toTransactionFormState,
} from "../transactions.schema";
import type { FinancialAccountRecord as AccountRecord } from "../../accounts/types/account.types";
import type { Goal } from "../../../types";
import type {
  TransactionRecord,
  TransactionSavePayload,
} from "../transaction.types";

interface TransactionCategory {
  id?: string | number;
  name: string;
  type: "income" | "expense" | "goal";
}

interface SourceOption {
  value: string;
  label: string;
}

interface DrawerGoalRecord extends Goal {
  _id?: string;
}

interface DrawerInitialValues extends Partial<TransactionRecord> {
  sourceAccountId?: number | null;
}

interface TransactionsAddEditDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (
    payload: TransactionSavePayload,
  ) => Promise<string | null | void> | string | null | void;
  categories?: TransactionCategory[];
  goals?: DrawerGoalRecord[];
  initialValues?: DrawerInitialValues | null;
  title?: string;
  submitLabel?: string;
  submitError?: string;
}

type SelectChangeLikeEvent = { target: { value: string } };

export default function TransactionsAddEditDrawer({
  open,
  onClose,
  onSubmit,
  categories = [],
  goals = [],
  initialValues = null,
  title = "Add Transaction",
  submitLabel = "Save",
  submitError = "",
}: TransactionsAddEditDrawerProps) {
  const [sourceOptions, setSourceOptions] = useState<SourceOption[]>([]);
  const [localSubmitError, setLocalSubmitError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: createDefaultTransactionForm(),
    mode: "onTouched",
  });

  const selectedType = watch("type");
  const showCategory = selectedType === "INCOME" || selectedType === "EXPENSE";
  const showSource = selectedType === "EXPENSE" || selectedType === "TRANSFER";
  const showDestination = selectedType === "INCOME" || selectedType === "TRANSFER";

  const getErrorMessage = (message: unknown): string | undefined =>
    typeof message === "string" ? message : undefined;

  const toDateFieldValue = (value: unknown): Dayjs | null => {
    const parsed = dayjs(value as dayjs.ConfigType);
    return parsed.isValid() ? parsed : null;
  };

  const categoryOptions = useMemo(
    () =>
      categories
        .filter(
          (category: TransactionCategory) =>
            category?.type === "income" || category?.type === "expense",
        )
        .map((category: TransactionCategory) => ({
          value: category.name,
          label: category.name,
        })),
    [categories],
  );

  const categoryMetaByName = useMemo(
    () =>
      new Map<string, { id?: string | number; name: string; type: string }>(
        categories
          .filter(
            (category: TransactionCategory) =>
              category?.name &&
              (category?.type === "income" || category?.type === "expense"),
          )
          .map((category: TransactionCategory) => [
            category.name.trim().toLowerCase(),
            category,
          ]),
      ),
    [categories],
  );

  const goalOptions = useMemo(
    () => [
      { value: "none", label: "No linked goal" },
      ...goals.map((goal: DrawerGoalRecord) => ({
        value: goal._id || goal.id,
        label: goal.name || "Untitled Goal",
      })),
    ],
    [goals],
  );

  const applyIncomeDefaults = () => {
    const hasSalaryCategory = categoryOptions.some(
      (option) => option.value === "Salary",
    );
    const hdfcSource = sourceOptions.find((option) =>
      String(option.label || "")
        .toLowerCase()
        .includes("hdfc"),
    );

    if (hasSalaryCategory) {
      setValue("category", "Salary", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (hdfcSource) {
      setValue("destination", String(hdfcSource.value), {
        shouldDirty: true,
        shouldValidate: true,
      });
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
            (accounts || []).map((account: AccountRecord) => ({
              value: String(account.id),
              label:
                account.displayName ||
                account.institutionName ||
                account.name ||
                "Unknown account",
            })),
          );
        }
      } catch (error) {
        void error;
        if (active) setSourceOptions([]);
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
      categoryId: matchedCategory?.id || null,
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
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1.5,
      }}
    >
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
          {resolvedSubmitError ? (
            <Alert severity="error">{resolvedSubmitError}</Alert>
          ) : null}

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
              name="type"
              control={control}
              render={({ field }) => (
                <LabeledSelectField
                  labelText="Type"
                  value={field.value || "EXPENSE"}
                  onChange={(event: SelectChangeLikeEvent) => {
                    const nextType = event.target.value;
                    field.onChange(nextType);
                    if (nextType === "INCOME") {
                      setValue("source", "", { shouldDirty: true });
                      applyIncomeDefaults();
                    } else if (nextType === "EXPENSE") {
                      setValue("destination", "", { shouldDirty: true });
                    } else {
                      setValue("category", "", { shouldDirty: true });
                    }
                  }}
                  options={[
                    { value: "INCOME", label: "Income" },
                    { value: "EXPENSE", label: "Expense" },
                    { value: "TRANSFER", label: "Transfer" },
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
                  value={
                    (field.value as string | number | null | undefined) ?? ""
                  }
                  onValueChange={field.onChange}
                  placeholder="Enter amount"
                  errorMessage={getErrorMessage(errors.amount?.message)}
                />
              )}
            />
          </Box>

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
            {showCategory ? (
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <LabeledSelectField
                    labelText="Category"
                    value={field.value || ""}
                    onChange={(event: SelectChangeLikeEvent) =>
                      field.onChange(event.target.value)
                    }
                    options={categoryOptions}
                    errorMessage={getErrorMessage(errors.category?.message)}
                  />
                )}
              />
            ) : null}

            {showSource ? (
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <LabeledSelectField
                    labelText="Source account"
                    value={field.value || ""}
                    onChange={(event: SelectChangeLikeEvent) =>
                      field.onChange(event.target.value)
                    }
                    options={sourceOptions}
                    errorMessage={getErrorMessage(errors.source?.message)}
                  />
                )}
              />
            ) : null}

            {showDestination ? (
              <Controller
                name="destination"
                control={control}
                render={({ field }) => (
                  <LabeledSelectField
                    labelText="Destination account"
                    value={field.value || ""}
                    onChange={(event: SelectChangeLikeEvent) =>
                      field.onChange(event.target.value)
                    }
                    options={sourceOptions}
                    errorMessage={getErrorMessage(errors.destination?.message)}
                  />
                )}
              />
            ) : null}
          </Box>

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
              name="goalId"
              control={control}
              render={({ field }) => (
                <LabeledSelectField
                  labelText="Goal"
                  value={field.value || "none"}
                  onChange={(event: SelectChangeLikeEvent) =>
                    field.onChange(
                      event.target.value === "none" ? "" : event.target.value,
                    )
                  }
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
                  value={toDateFieldValue(field.value)}
                  onChange={(value) => field.onChange(value)}
                  errorMessage={getErrorMessage(errors.date?.message)}
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
