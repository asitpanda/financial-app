import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

interface ProgressBarProps {
  value: number;
  label?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

export default function ProgressBar({ value, label, color = 'primary' }: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <Box>
      <LinearProgress
        variant="determinate"
        value={normalized}
        color={color}
        sx={{ height: 8, borderRadius: 10 }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
        {label ? <Typography variant="caption" color="text.secondary">{label}</Typography> : <span />}
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {Math.round(normalized)}%
        </Typography>
      </Box>
    </Box>
  );
}
