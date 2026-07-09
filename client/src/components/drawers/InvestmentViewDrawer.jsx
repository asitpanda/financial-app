import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import AppDrawer from './AppDrawer';
import AppButton from '../common/AppButton';
import { EmptyState, SectionCard, StatusChip } from '../common';
import {
  formatInvestmentCurrency,
  formatInvestmentDate,
  getInvestmentCategoryLabel,
  getInvestmentStatusTone,
} from '../../utils/investmentHelpers';

export default function InvestmentViewDrawer({
  open,
  onClose,
  investment,
  taxonomyNodes = [],
  onEdit,
}) {
  const footer = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
      <AppButton variant="outlined" onClick={onClose} sx={{ minWidth: 120 }}>
        Close
      </AppButton>
      {investment ? (
        <AppButton
          variant="contained"
          onClick={() => onEdit?.(investment)}
          sx={{ minWidth: 160 }}
        >
          Edit Investment
        </AppButton>
      ) : null}
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={investment?.name || 'Investment Details'}
      subtitle="Review current value, dates, and notes."
      width={760}
      footer={footer}
    >
      {!investment ? (
        <EmptyState
          text="Investment not found"
          subText="This investment no longer exists or the list changed."
          actionLabel="Close"
          onAction={onClose}
        />
      ) : (
        <Stack spacing={2}>
          <SectionCard title="Overview" subtitle={`${investment.institution} • ${investment.type}`}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Total Invested</Typography>
                <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800 }}>{formatInvestmentCurrency(investment.totalInvested)}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Current Value</Typography>
                <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800 }}>{formatInvestmentCurrency(investment.currentValue || investment.totalInvested)}</Typography>
              </Paper>
            </Box>
          </SectionCard>

          <SectionCard title="Common Information">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Status</Typography><Box sx={{ mt: 0.75 }}><StatusChip label={investment.status} tone={getInvestmentStatusTone(investment.status)} /></Box></Paper>
              <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Category</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{getInvestmentCategoryLabel(investment.category, taxonomyNodes)}</Typography></Paper>
              <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Start Date</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{formatInvestmentDate(investment.startDate)}</Typography></Paper>
              <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Reference</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{investment.referenceNumber || 'Not recorded'}</Typography></Paper>
            </Box>
          </SectionCard>

          <SectionCard title="Investment Details">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Asset Type</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{investment.type}</Typography></Paper>
              <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Holding Mode</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{investment.holdingMode || 'Not recorded'}</Typography></Paper>
              <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Maturity Date</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{formatInvestmentDate(investment.maturityDate)}</Typography></Paper>
              <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Insurance Cover</Typography><Typography sx={{ mt: 0.75, fontWeight: 700 }}>{formatInvestmentCurrency(investment.insuranceCover)}</Typography></Paper>
            </Box>
          </SectionCard>

          <SectionCard title="Documents" subtitle="Stored as operational references in MVP.">
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              {investment.documents || 'No document references added'}
            </Typography>
          </SectionCard>

          <SectionCard title="Notes">
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              {investment.notes || 'No notes added'}
            </Typography>
          </SectionCard>
        </Stack>
      )}
    </AppDrawer>
  );
}