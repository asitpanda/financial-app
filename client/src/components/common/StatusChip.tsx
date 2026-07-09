import React from 'react';
import { Chip } from '@mui/material';

type StatusTone = 'success' | 'error' | 'warning' | 'info' | 'default';

interface StatusChipProps {
  label: string;
  tone?: StatusTone;
}

export default function StatusChip({ label, tone = 'default' }: StatusChipProps) {
  return (
    <Chip
      size="small"
      label={label}
      variant="outlined"
      color={tone === 'default' ? 'default' : tone}
      sx={{ textTransform: 'capitalize', fontWeight: 600 }}
    />
  );
}
