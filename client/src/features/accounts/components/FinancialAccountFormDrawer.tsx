// @ts-nocheck
import React, { useEffect } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AppDrawer from '../../../components/drawers/AppDrawer';
import AppButton from '../../../components/common/AppButton';
import { LabeledSelectField, LabeledTextField } from '../../../components/common';
import {
  createFinancialAccount,
  updateFinancialAccount,
} from '../financialAccounts.api';
import { getRuntimeErrorMessage } from '../../../utils/errorMessage';

import { z } from 'zod';

const accountSchema = z.object({
  name: z.string().trim().min(2, 'Internal name is required'),
  displayName: z.string().trim().min(2, 'Display name is required'),
  accountType: z.string().trim().min(1, 'Account type is required'),
  institutionName: z.string().trim().optional(),
  accountNumberMasked: z.string().trim().optional(),
  currency: z.string().trim().min(3, 'Currency is required'),
  isActive: z.boolean().default(true),
});

const defaultValues = {
  name: '',
  displayName: '',
  accountType: 'bank',
  institutionName: '',
  accountNumberMasked: '',
  currency: 'INR',
  isActive: true,
};

const accountTypeOptions = [
  { value: 'bank', label: 'Bank' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'investment', label: 'Investment' },
];

const activeOptions = [
  { value: true, label: 'Active' },
  { value: false, label: 'Inactive' },
];

const toFormState = (account) => {
  if (!account) return defaultValues;
  return {
    name: account.name || '',
    displayName: account.displayName || '',
    accountType: account.accountType || 'bank',
    institutionName: account.institutionName || '',
    accountNumberMasked: account.accountNumberMasked || '',
    currency: account.currency || 'INR',
    isActive: account.isActive !== false,
  };
};

export default function FinancialAccountFormDrawer({
  open,
  onClose,
  initialValues = null,
  onUpdated,
  title = 'Add Account',
  submitLabel = 'Add',
}) {
  const [saving, setSaving] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues,
    mode: 'onTouched',
  });

  const isEdit = Boolean(initialValues?.id);

  useEffect(() => {
    if (!open) return;
    reset(toFormState(initialValues));
    setSubmitError('');
  }, [open, initialValues, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('');
    setSaving(true);
    try {
      const payload = {
        ...values,
        name: values.name.trim(),
        displayName: values.displayName.trim(),
        institutionName: values.institutionName?.trim() || undefined,
        accountNumberMasked: values.accountNumberMasked?.trim() || undefined,
        currency: values.currency.trim().toUpperCase(),
      };

      if (isEdit) {
        await updateFinancialAccount(initialValues.id, payload);
      } else {
        await createFinancialAccount(payload);
      }

      reset(defaultValues);
      onUpdated?.();
      onClose?.();
    } catch (error) {
      setSubmitError(getRuntimeErrorMessage(error, isEdit ? 'Failed to update account' : 'Failed to create account'));
    } finally {
      setSaving(false);
    }
  });

  const footer = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
      <AppButton type="button" variant="outlined" onClick={onClose}>
        Cancel
      </AppButton>
      <AppButton type="button" variant="contained" onClick={onSubmit} disabled={saving}>
        {submitLabel}
      </AppButton>
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Create and update bank and wallet accounts"
      footer={footer}
      width={680}
    >
      <Stack spacing={2}>
        {submitError ? <Alert severity="error">{submitError}</Alert> : null}

        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {isEdit ? 'Edit Account' : 'Create Account'}
        </Typography>

        <LabeledTextField
          labelText="Internal Name"
          {...register('name')}
          placeholder="e.g. icici-savings"
          errorMessage={errors.name?.message}
        />

        <LabeledTextField
          labelText="Display Name"
          {...register('displayName')}
          placeholder="e.g. ICICI Savings Account"
          errorMessage={errors.displayName?.message}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <Controller
            name="accountType"
            control={control}
            render={({ field }) => (
              <LabeledSelectField
                labelText="Account Type"
                value={field.value || 'bank'}
                onChange={(event) => field.onChange(event.target.value)}
                options={accountTypeOptions}
                errorMessage={errors.accountType?.message}
              />
            )}
          />

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <LabeledSelectField
                labelText="Status"
                value={field.value !== false}
                onChange={(event) => field.onChange(event.target.value === true || event.target.value === 'true')}
                options={activeOptions}
              />
            )}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <LabeledTextField
            labelText="Institution"
            {...register('institutionName')}
            placeholder="e.g. ICICI Bank"
            errorMessage={errors.institutionName?.message}
          />
          <LabeledTextField
            labelText="Masked Account"
            {...register('accountNumberMasked')}
            placeholder="e.g. XXXX2211"
            errorMessage={errors.accountNumberMasked?.message}
          />
        </Box>

        <LabeledTextField
          labelText="Currency"
          {...register('currency')}
          placeholder="INR"
          errorMessage={errors.currency?.message}
        />
      </Stack>
    </AppDrawer>
  );
}
