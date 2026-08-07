// @ts-nocheck
import React, { useState } from 'react';
import { Alert, Box, Modal, Stack, TextField, Typography, CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import AppButton from '../../../components/common/AppButton';
import { useNotificationStore } from '../../../store/notificationStore';
import apiClient from '../../../api/client';
import { validateRecordContributionForm } from '../investment.schema';
import { skipCurrentContributionPlan } from '../api/contributionPlans.api';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 500 },
  maxHeight: '90vh',
  overflowY: 'auto',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 3,
};

export default function RecordContributionModal({
  open,
  onClose,
  investment,
  contributionPlan,
  accounts = [],
  onContributionRecorded,
}) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [formData, setFormData] = useState({
    contributionDate: dayjs().format('YYYY-MM-DD'),
    amount: contributionPlan?.amount || '',
    sourceAccountId: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const { pushNotification } = useNotificationStore();
  const loading = Boolean(loadingAction);

  const resolvedSourceAccountId =
    investment?.accountId != null && investment?.accountId !== ''
      ? String(investment.accountId)
      : contributionPlan?.sourceAccountId != null &&
          contributionPlan?.sourceAccountId !== ''
        ? String(contributionPlan.sourceAccountId)
        : '';

  const sourceAccountLabel =
    accounts.find(
      (account) => String(account.id) === String(resolvedSourceAccountId),
    )?.displayName ||
    accounts.find(
      (account) => String(account.id) === String(resolvedSourceAccountId),
    )?.name ||
    accounts.find(
      (account) => String(account.id) === String(resolvedSourceAccountId),
    )?.institutionName ||
    (resolvedSourceAccountId
      ? `Account ${resolvedSourceAccountId}`
      : 'No linked funding account');
  const currentDueDateLabel = contributionPlan?.nextDueDate
    ? dayjs(contributionPlan.nextDueDate).format('DD MMM YYYY')
    : 'No due contribution date';

  React.useEffect(() => {
    if (!open) return;

    setFormData({
      contributionDate: dayjs().format('YYYY-MM-DD'),
      amount: contributionPlan?.amount || '',
      sourceAccountId: resolvedSourceAccountId,
      notes: '',
    });
    setErrors({});
  }, [open, contributionPlan?.amount, resolvedSourceAccountId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = () => {
    const validationErrors = validateRecordContributionForm(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoadingAction('record');
    try {
      const payload = {
        investmentId: String(investment.id),
        contributionPlanId: String(contributionPlan.id),
        sourceAccountId: formData.sourceAccountId,
        amount: Number(formData.amount),
        transactionDate: formData.contributionDate,
        notes: formData.notes || `Contribution for ${investment.name}`,
      };

      const response = await apiClient.post('/transactions/contributions/record', payload);

      pushNotification({ 
        message: `Contribution of ₹${Number(formData.amount).toLocaleString()} recorded successfully`, 
        type: 'success' 
      });

      // Reset form
      setFormData({
        contributionDate: dayjs().format('YYYY-MM-DD'),
        amount: contributionPlan?.amount || '',
        sourceAccountId: '',
        notes: '',
      });
      setErrors({});

      onContributionRecorded?.(response.data);
      onClose();
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to record contribution';
      pushNotification({ message, type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSkipCurrentContribution = async () => {
    if (!investment?.id || !contributionPlan?.id) return;

    setLoadingAction('skip');
    try {
      const response = await skipCurrentContributionPlan(
        investment.id,
        contributionPlan.id,
        {
          notes: formData.notes || undefined,
        },
      );

      pushNotification({
        message: `Skipped the due contribution for ${currentDueDateLabel}`,
        type: 'success',
      });

      onContributionRecorded?.(response);
      onClose();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to skip the current contribution';
      pushNotification({ message, type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="record-contribution-modal"
    >
      <Box sx={modalStyle}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Record Contribution
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {investment?.name} • {contributionPlan?.cadenceInterval} {contributionPlan?.cadenceUnit}
          </Typography>
        </Box>

        {/* Form */}
        <Stack spacing={2.5} sx={{ mb: 3 }}>
          <Alert severity="info">
            Record this contribution if it was paid. If the user wants to miss
            only this cycle, use Skip This Month and the recurring plan will
            continue from the next due date.
          </Alert>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              Current Due Contribution
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={currentDueDateLabel}
              helperText="Skip applies to this scheduled due occurrence only."
              InputProps={{ readOnly: true }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              Contribution Date
            </Typography>
            <TextField
              type="date"
              fullWidth
              size="small"
              value={formData.contributionDate}
              onChange={(e) => handleInputChange('contributionDate', e.target.value)}
              error={Boolean(errors.contributionDate)}
              helperText={errors.contributionDate || ''}
              inputProps={{ style: { fontSize: 14 } }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              Amount (₹)
            </Typography>
            <TextField
              type="number"
              fullWidth
              size="small"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              error={Boolean(errors.amount)}
              helperText={errors.amount || ''}
              inputProps={{ step: '0.01', style: { fontSize: 14 } }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              Source Account
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={sourceAccountLabel}
              error={Boolean(errors.sourceAccountId)}
              helperText={
                errors.sourceAccountId ||
                'This contribution will be recorded against the linked investment account.'
              }
              InputProps={{ readOnly: true }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              Notes (Optional)
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder="Add any notes..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
            />
          </Box>
        </Stack>

        {/* Footer */}
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <AppButton
            variant="outlined"
            onClick={handleClose}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            Cancel
          </AppButton>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', marginLeft: 'auto' }}>
            <AppButton
              variant="outlined"
              color="warning"
              onClick={handleSkipCurrentContribution}
              disabled={loading || !contributionPlan?.nextDueDate}
              sx={{ minWidth: 160 }}
            >
              {loadingAction === 'skip' ? (
                <CircularProgress size={20} sx={{ mr: 1 }} />
              ) : null}
              Skip This Month
            </AppButton>
            <AppButton
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              sx={{ minWidth: 180 }}
            >
              {loadingAction === 'record' ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
              Record Contribution
            </AppButton>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}
