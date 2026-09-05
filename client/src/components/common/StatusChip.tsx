import React from 'react';
import { Chip } from '@mui/material';

type StatusTone = 'success' | 'error' | 'warning' | 'info' | 'default';

interface StatusChipProps {
  label: string;
  tone?: StatusTone;
  hexColor?: string;
}

export default function StatusChip({ label, tone = 'default', hexColor }: StatusChipProps) {
  return (
    <Chip
      size="small"
      label={label}
      variant="outlined"
      color={hexColor ? undefined : tone === 'default' ? 'default' : tone}
      sx={{
        textTransform: 'capitalize',
        fontWeight: 600,
        ...(hexColor ? { color: hexColor, borderColor: hexColor } : {}),
      }}
    />
  );
}
