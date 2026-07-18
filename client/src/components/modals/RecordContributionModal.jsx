import React, { useState } from 'react';
import { Box, Modal, Stack, TextField, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { getFinancialAccounts } from '../../api/financialAccounts';
import dayjs from 'dayjs';
import AppButton from '../common/AppButton';
import { useNotificationStore } from '../../store/notificationStore';
import apiClient from '../../api/client';
import { validateRecordContributionForm } from '../../validation/investmentSchema';

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
  onContributionRecorded,
}) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    contributionDate: dayjs().format('YYYY-MM-DD'),
    amount: contributionPlan?.amount || '',
    sourceAccountId: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const { pushNotification } = useNotificationStore();
  
  // Load accounts on mount
  React.useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await getFinancialAccounts();
        setAccounts(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    };
    
    if (open) {
      loadAccounts();
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    setFormData({
      contributionDate: dayjs().format('YYYY-MM-DD'),
      amount: contributionPlan?.amount || '',
      sourceAccountId: '',
      notes: '',
    });
    setErrors({});
  }, [open, contributionPlan?.amount]);

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

    setLoading(true);
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
      setLoading(false);
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

          <FormControl fullWidth size="small" error={Boolean(errors.sourceAccountId)}>
            <InputLabel>Source Account</InputLabel>
            <Select
              value={formData.sourceAccountId}
              label="Source Account"
              onChange={(e) => handleInputChange('sourceAccountId', e.target.value)}
            >
              <MenuItem value="">Select account...</MenuItem>
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.displayName || account.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.sourceAccountId || ''}</FormHelperText>
          </FormControl>

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
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'space-between' }}>
          <AppButton 
            variant="outlined" 
            onClick={handleClose}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{ minWidth: 160 }}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            Record Contribution
          </AppButton>
        </Box>
      </Box>
    </Modal>
  );
}
