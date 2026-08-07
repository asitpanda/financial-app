// @ts-nocheck
import React, { useState } from 'react';
import { Alert, Box, Modal, Stack, TextField, Typography, Button, CircularProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import AppButton from '../../../components/common/AppButton';
import { useNotificationStore } from '../../../store/notificationStore';
import {
  createValuationSnapshot,
  updateValuationSnapshot,
} from '../api/valuationSnapshots.api';
import { getRuntimeErrorMessage } from '../../../utils/errorMessage';

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
}) {
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
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    try {
      const payload = {
        investmentId: String(investmentId),
        snapshotDate: formData.snapshotDate,
        marketValue: Number(formData.marketValue),
        units: formData.units ? Number(formData.units) : null,
        price: formData.price ? Number(formData.price) : null,
        source: 'manual',
      };

      const savedSnapshot = snapshot?.id
        ? await updateValuationSnapshot(snapshot.id, payload)
        : await createValuationSnapshot(payload);
      
      pushNotification({
        message: snapshot?.id
          ? `Valuation updated for ${dayjs(formData.snapshotDate).format('MMM DD, YYYY')}`
          : `Valuation recorded for ${dayjs(formData.snapshotDate).format('MMM DD, YYYY')}`,
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

          {/* Snapshot Date */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
              Snapshot Date *
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
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
                format="DD MMM YYYY"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    placeholder: 'Select snapshot date',
                    inputProps: {
                      readOnly: true,
                    },
                  },
                }}
              />
            </LocalizationProvider>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Future dates are not allowed for valuation snapshots.
            </Typography>
          </Box>

          {/* Current Value */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
              Total Asset Value On That Date (₹) *
            </Typography>
            <TextField
              type="number"
              fullWidth
              placeholder="e.g., 458000"
              value={formData.marketValue}
              onChange={(e) => handleInputChange('marketValue', e.target.value)}
              disabled={loading}
              size="small"
              inputProps={{ step: '1', min: '0' }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', lineHeight: 1.5 }}>
              Enter the investment’s total value on the selected date, including principal and any interest, profit, or market gains. This is recorded as a valuation snapshot and does not affect your contribution history.
            </Typography>
          </Box>

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
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
                  Units (Optional)
                </Typography>
                <TextField
                  type="number"
                  fullWidth
                  placeholder="e.g., 100"
                  value={formData.units}
                  onChange={(e) => handleInputChange('units', e.target.value)}
                  disabled={loading}
                  size="small"
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
                  Price per Unit (₹) (Optional)
                </Typography>
                <TextField
                  type="number"
                  fullWidth
                  placeholder="e.g., 4580"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  disabled={loading}
                  size="small"
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Box>
            </>
          ) : null}

          {/* Note */}
          <Box sx={{ p: 1.5, bgcolor: '#f3f4f6', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
              <strong>Required:</strong> Snapshot Date and total asset value on that date
              <br />
              <strong>When to use:</strong> Only when you want to update the latest known balance/value, not for every monthly contribution
              <br />
              <strong>Optional:</strong> Units and Price for market-linked assets only
            </Typography>
          </Box>
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
