// @ts-nocheck
import React, { useState } from 'react';
import { Box, Modal, Stack, TextField, Typography, Button, CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import AppButton from '../../../components/common/AppButton';
import { useNotificationStore } from '../../../store/notificationStore';
import apiClient from '../../../api/client';

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
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    snapshotDate: dayjs().format('YYYY-MM-DD'),
    marketValue: '',
    units: '',
    price: '',
  });
  const { pushNotification } = useNotificationStore();

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
        userId: '1', // Default to user 1 for mock
      };

      const response = await apiClient.post('/valuations/snapshots', payload);
      const snapshot = response.data;
      
      pushNotification({ message: `Valuation recorded for ${dayjs(formData.snapshotDate).format('MMM DD, YYYY')}`, type: 'success' });
      
      // Reset form
      setFormData({
        snapshotDate: dayjs().format('YYYY-MM-DD'),
        marketValue: '',
        units: '',
        price: '',
      });

      onSnapshotAdded?.(snapshot);
      onClose();
    } catch (error) {
      pushNotification({ message: error.message || 'Failed to record valuation', type: 'error' });
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
            Record Valuation
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {investmentName}
          </Typography>
        </Box>

        {/* Form */}
        <Stack spacing={2}>
          {/* Snapshot Date */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
              Snapshot Date *
            </Typography>
            <TextField
              type="date"
              fullWidth
              value={formData.snapshotDate}
              onChange={(e) => handleInputChange('snapshotDate', e.target.value)}
              disabled={loading}
              slotProps={{ input: { max: dayjs().format('YYYY-MM-DD') } }}
              size="small"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {dayjs(formData.snapshotDate).format('ddd, MMM DD, YYYY')}
            </Typography>
          </Box>

          {/* Market Value */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
              Market Value (₹) *
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
          </Box>

          {/* Units (Optional) */}
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

          {/* Price (Optional) */}
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

          {/* Note */}
          <Box sx={{ p: 1.5, bgcolor: '#f3f4f6', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
              <strong>Required:</strong> Snapshot Date and Market Value
              <br />
              <strong>Optional:</strong> Units and Price (for detailed tracking)
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
              'Record Valuation'
            )}
          </AppButton>
        </Box>
      </Box>
    </Modal>
  );
}
