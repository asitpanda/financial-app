import React, { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  FormHelperText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Button from "./common/AppButton";
import Icon from "@mdi/react";
import AppDrawer from "./drawers/AppDrawer";
import { LabeledAutocompleteField, LabeledSelectField, LabeledTextField } from "../components/common";
import { useCategories } from "../hooks/useCategories";
import {
  createCategorySchema,
  createDefaultCategoryForm,
  toCategoryFormState,
} from "../validation/categorySchema";
import { CATEGORY_ICON_OPTIONS } from "../constants/categoryIcons";

const DEFAULT_TEXT_COLOR = "#111827";
const DEFAULT_ICON_BY_TYPE = {
  income: "cash",
  expense: "cart",
};
const CATEGORY_TYPE_OPTIONS = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const normalizeColor = (value) => {
  if (!value) return "";
  return value.startsWith("#") ? value : `#${value}`;
};

export default function CategoryFormDrawer({
  open,
  onClose,
  onSubmit,
  initialValues = null,
  title = "Add Category",
  submitLabel = "Add",
}) {
  const { data: categories = [] } = useCategories();
  const currentCategoryName = initialValues?.name?.trim().toLowerCase() || "";
  const existingCategoryNames = useMemo(
    () => categories.map((category) => category?.name?.trim().toLowerCase()).filter(Boolean),
    [categories]
  );
  const categoryValidationSchema = useMemo(
    () => createCategorySchema({ existingNames: existingCategoryNames, currentName: currentCategoryName }),
    [currentCategoryName, existingCategoryNames]
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    trigger,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categoryValidationSchema),
    defaultValues: createDefaultCategoryForm(),
    mode: "onTouched",
  });

  useEffect(() => {
    if (!open) return;
    const formState = toCategoryFormState(initialValues);
    const type = formState.type || "expense";
    reset({
      ...formState,
      type,
      icon: formState.icon || DEFAULT_ICON_BY_TYPE[type] || "cart",
      color: formState.color || DEFAULT_TEXT_COLOR,
    });
  }, [open, initialValues, reset]);

  useEffect(() => {
    if (!open) return;
    void trigger("name");
  }, [currentCategoryName, existingCategoryNames, open, trigger]);

  const typeValue = watch("type") || "expense";
  const iconValue = watch("icon");
  const colorValue = watch("color");
  const previewColor = /^#?[0-9A-Fa-f]{6}$/.test(colorValue || "")
    ? normalizeColor(colorValue)
    : DEFAULT_TEXT_COLOR;
  const previewIconOption =
    CATEGORY_ICON_OPTIONS.find((item) => item.value === (iconValue || DEFAULT_ICON_BY_TYPE[typeValue] || "cart")) ||
    CATEGORY_ICON_OPTIONS[0];

  const submit = handleSubmit((values) => {
    const resolvedIcon = values.icon?.trim() || DEFAULT_ICON_BY_TYPE[values.type] || "cart";
    onSubmit?.({
      name: values.name.trim(),
      type: values.type,
      icon: resolvedIcon,
      color: values.color ? normalizeColor(values.color.trim()) : undefined,
    });
  });

  const footer = (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5 }}>
      <Button type="button" variant="outlined" onClick={onClose}>
        Cancel
      </Button>
      <Button type="button" variant="contained" onClick={submit}>
        {submitLabel}
      </Button>
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Capture type, icon, and color details"
      footer={footer}
    >
      <Box
        component="form"
        id="category-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Stack spacing={1.5}>
          <LabeledTextField
            labelText="Name"
            {...register("name")}
            placeholder="Enter category name"
            errorMessage={errors.name?.message}
          />

          <Box>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <LabeledSelectField
                  {...field}
                  labelText="Type"
                  options={CATEGORY_TYPE_OPTIONS}
                  errorMessage={errors.type?.message}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    const previousType = field.value;
                    const currentIcon = getValues("icon");

                    field.onChange(e);

                    const shouldAutoUpdateIcon =
                      !currentIcon || currentIcon === DEFAULT_ICON_BY_TYPE[previousType];

                    if (shouldAutoUpdateIcon && DEFAULT_ICON_BY_TYPE[nextType]) {
                      setValue("icon", DEFAULT_ICON_BY_TYPE[nextType], {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                />
              )}
            />
          </Box>
          <Box>
            <Controller
              name="icon"
              control={control}
              render={({ field }) => {
                const safeIconValue = field.value || DEFAULT_ICON_BY_TYPE[typeValue] || "cart";
                const selectedIconOption =
                  CATEGORY_ICON_OPTIONS.find((item) => item.value === safeIconValue) ||
                  CATEGORY_ICON_OPTIONS[0];

                return (
                  <LabeledAutocompleteField
                    labelText="Icon"
                    options={CATEGORY_ICON_OPTIONS}
                    disableClearable
                    autoHighlight
                    value={selectedIconOption}
                    isOptionEqualToValue={(option, value) => option.value === value.value}
                    getOptionLabel={(option) => `${option.label} (${option.value})`}
                    onChange={(_, option) => {
                      field.onChange(option?.value || DEFAULT_ICON_BY_TYPE[typeValue] || "cart");
                    }}
                    placeholder="Select icon"
                    errorMessage={errors.icon?.message}
                    helperText="Suggested: Cash for income, Cart for expense."
                    renderOption={(props, option) => (
                      <Box component="li" {...props} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Icon path={option.path} size={0.85} />
                        <span>{option.label}</span>
                        <Typography variant="caption" color="text.secondary">
                          ({option.value})
                        </Typography>
                      </Box>
                    )}
                  />
                );
              }}
            />
          </Box>
          <Controller
            name="color"
            control={control}
            render={({ field }) => {
              const hasValidValue = /^#?[0-9A-Fa-f]{6}$/.test(field.value || "");
              const colorInputValue = hasValidValue ? normalizeColor(field.value) : DEFAULT_TEXT_COLOR;
              const hexValue = hasValidValue ? normalizeColor(field.value) : DEFAULT_TEXT_COLOR;

              return (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateRows: "20px auto 20px",
                    alignItems: "stretch",
                    alignContent: "start",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontWeight: 400,
                      height: 20,
                      lineHeight: "20px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    Color
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "84px minmax(0, 1fr) auto" },
                      gap: 1,
                      alignItems: "center",
                    }}
                  >
                    <TextField
                      type="color"
                      size="small"
                      value={colorInputValue}
                      onChange={(e) => field.onChange(e.target.value || "")}
                      onBlur={field.onBlur}
                      sx={{
                        width: { xs: "100%", sm: 84 },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "5px",
                          height: 43,
                        },
                      }}
                      inputRef={field.ref}
                    />
                    <TextField
                      value={hexValue}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      placeholder="#111827"
                      error={Boolean(errors.color)}
                      inputProps={{ maxLength: 7 }}
                      size="small"
                      fullWidth
                      sx={{
                        gridColumn: { xs: "1 / -1", sm: "auto" },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "5px",
                          height: 43,
                          alignItems: "center",
                        },
                      }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => field.onChange(DEFAULT_TEXT_COLOR)}
                      sx={{
                        minWidth: 86,
                        height: 43,
                        flexShrink: 0,
                        gridColumn: { xs: "1 / -1", sm: "auto" },
                      }}
                    >
                      Default
                    </Button>
                  </Box>

                  <FormHelperText
                    error={Boolean(errors.color)}
                    sx={{
                      height: 20,
                      lineHeight: "20px",
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {errors.color?.message || `Optional. Default color is ${DEFAULT_TEXT_COLOR}.`}
                  </FormHelperText>
                </Box>
              );
            }}
          />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 0.5,
              px: 1.5,
              py: 1.25,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: "50%",
                width: 68,
                height: 68,
                bgcolor: previewColor,
                border: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
              }}
            >
              <Icon path={previewIconOption.path} size={1.5} color="#ffffff" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Live preview
              </Typography>
              <Typography variant="caption" color="text.secondary">
                The selected icon and color will be used anywhere this category is displayed.
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Box>
    </AppDrawer>
  );
}
