// @ts-nocheck
import React, { useState } from 'react';
import { Alert, Box, Divider, Modal, Stack, Typography, Button, CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import AppButton from '../../../components/common/AppButton';
import LabelCurrencyField from '../../../components/common/LabelCurrencyField';
import LabeledDateField from '../../../components/common/LabeledDateField';
import LabeledTextField from '../../../components/common/LabeledTextField';
import { useNotificationStore } from '../../../store/notificationStore';
import { useSaveInvestmentSnapshot } from '../hooks/useInvestmentSnapshots';
import { getRuntimeErrorMessage } from '../../../utils/errorMessage';
import { useCurrencyFormatter } from '../../../utils/currency';
import { useDateFormatter } from '../../../utils/date';

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

export default function RecordValuationModal({
  open,
  onClose,
  investmentId,
  investmentName,
  onSnapshotAdded,
  onSnapshotSaved,
  snapshot,
  totalInvested,
  currentValue,
  currency = 'INR',
}) {
  const formatCurrency = useCurrencyFormatter();
  const formatDate = useDateFormatter();
  const getInitialFormData = React.useCallback(
    (currentSnapshot) => ({
      snapshotDate: currentSnapshot?.snapshotDate
        ? dayjs(currentSnapshot.snapshotDate).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD'),
      marketValue:
        currentSnapshot?.marketValue !== null &&
        currentSnapshot?.marketValue !== undefined
          ? String(currentSnapshot.marketValue)
          : '',
      units:
        currentSnapshot?.units !== null && currentSnapshot?.units !== undefined
          ? String(currentSnapshot.units)
          : '',
      price:
        currentSnapshot?.price !== null && currentSnapshot?.price !== undefined
          ? String(currentSnapshot.price)
          : '',
    }),
    [],
  );
  const saveSnapshotMutation = useSaveInvestmentSnapshot();
  const loading = saveSnapshotMutation.isPending;
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [formData, setFormData] = useState(getInitialFormData(snapshot));
  const { pushNotification } = useNotificationStore();
  const todayDate = dayjs();

  React.useEffect(() => {
    if (!open) return;

    setFormData(getInitialFormData(snapshot));
    setShowAdvancedFields(
      Boolean(snapshot?.units !== null && snapshot?.units !== undefined) ||
        Boolean(snapshot?.price !== null && snapshot?.price !== undefined),
    );
  }, [getInitialFormData, open, snapshot]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.snapshotDate) {
      pushNotification({ message: 'Snapshot date is required', type: 'error' });
      return false;
    }
    if (dayjs(formData.snapshotDate).isAfter(dayjs(), 'day')) {
      pushNotification({
        message: 'Snapshot date cannot be in the future',
        type: 'error'
      });
      return false;
    }
    if (!formData.marketValue || Number(formData.marketValue) <= 0) {
      pushNotification({ message: 'Market value must be greater than 0', type: 'error' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        investmentId: String(investmentId),
        snapshotDate: formData.snapshotDate,
        marketValue: Number(formData.marketValue),
        units: formData.units ? Number(formData.units) : null,
        price: formData.price ? Number(formData.price) : null,
        source: 'manual',
      };

      const savedSnapshot = await saveSnapshotMutation.mutateAsync({
        snapshotId: snapshot?.id,
        payload,
      });
      
      pushNotification({
        message: snapshot?.id
          ? `Valuation updated for ${formatDate(formData.snapshotDate)}`
          : `Valuation recorded for ${formatDate(formData.snapshotDate)}`,
        type: 'success'
      });
      
      // Reset form
      setFormData(getInitialFormData(null));
      setShowAdvancedFields(false);

      onSnapshotAdded?.(savedSnapshot);
      onSnapshotSaved?.(savedSnapshot);
      onClose();
    } catch (error) {
      pushNotification({
        message: getRuntimeErrorMessage(
          error,
          snapshot?.id ? 'Failed to update valuation' : 'Failed to record valuation',
        ),
        type: 'error'
      });
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
      aria-labelledby="record-valuation-modal"
    >
      <Box sx={modalStyle}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {snapshot?.id ? 'Edit Valuation' : 'Record Valuation'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {investmentName}
          </Typography>
          {(totalInvested != null || currentValue != null) && (
            <>
              <Divider sx={{ my: 1.25 }} />
              <Box sx={{ display: 'flex', gap: 3 }}>
                {totalInvested != null && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                      Total Invested
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatCurrency(totalInvested, currency, { maximumFractionDigits: 0 })}
                    </Typography>
                  </Box>
                )}
                {currentValue != null && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                      Current Value
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatCurrency(currentValue, currency, { maximumFractionDigits: 0 })}
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>

        {/* Form */}
        <Stack spacing={2}>
          <Alert severity="info">
            Use this to record a valuation snapshot for any investment,
            including PPF, Sukanya, RD, postal products, funds, or shares.
            This does not add a contribution. It stores the asset's total value
            on the selected date. You do not need to enter this after every
            recurring contribution.
          </Alert>

          <LabeledDateField
            labelText="Snapshot Date *"
            value={formData.snapshotDate ? dayjs(formData.snapshotDate) : null}
            onChange={(value) =>
              handleInputChange(
                'snapshotDate',
                value && value.isValid() ? value.format('YYYY-MM-DD') : '',
              )
            }
            disabled={loading}
            disableFuture
            maxDate={todayDate}
            helperText="Future dates are not allowed for valuation snapshots."
          />

          {/* Current Value */}
          <LabelCurrencyField
            labelText="Total Asset Value On That Date *"
            currencyCode={currency}
            placeholder="e.g., 458000"
            value={formData.marketValue}
            onValueChange={(value) => handleInputChange('marketValue', value)}
            disabled={loading}
            helperText="Enter the investment's total value on the selected date, including principal and any interest, profit, or market gains. This is recorded as a valuation snapshot and does not affect your contribution history."
          />

          <Box>
            <Button
              variant="text"
              onClick={() => setShowAdvancedFields((current) => !current)}
              disabled={loading}
              sx={{ px: 0, minWidth: 0, textTransform: 'none', alignSelf: 'flex-start' }}
            >
              {showAdvancedFields
                ? 'Hide unit and price fields'
                : 'Add unit and price details (optional)'}
            </Button>
          </Box>

          {showAdvancedFields ? (
            <>
              <LabeledTextField
                labelText="Units (Optional)"
                type="number"
                placeholder="e.g., 100"
                value={formData.units}
                onChange={(event) => handleInputChange('units', event.target.value)}
                disabled={loading}
                slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
              />

              <LabelCurrencyField
                labelText="Price per Unit (Optional)"
                currencyCode={currency}
                placeholder="e.g., 4580"
                value={formData.price}
                onValueChange={(value) => handleInputChange('price', value)}
                disabled={loading}
              />
            </>
          ) : null}
        </Stack>

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={loading}
            sx={{ minWidth: 100 }}
          >
            Cancel
          </Button>
          <AppButton
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{ minWidth: 140, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            {loading ? (
              <>
                <CircularProgress size={16} color="inherit" />
                Saving...
              </>
            ) : (
              snapshot?.id ? 'Save Changes' : 'Record Valuation'
            )}
          </AppButton>
        </Box>
      </Box>
    </Modal>
  );
}
