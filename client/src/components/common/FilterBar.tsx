import React from 'react';
import { Box, Paper } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AppButton from './AppButton';

interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
  resetLabel?: string;
}

export default function FilterBar({ children, onReset, resetLabel = 'Reset Filters' }: FilterBarProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        mb: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? alpha(theme.palette.common.white, 0.9)
            : alpha(theme.palette.background.paper, 0.96),
        boxShadow: 'none',
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(6, minmax(0, 1fr))' }, gap: 1.5 }}>
        {children}
        {onReset ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'stretch', lg: 'flex-end' } }}>
            <AppButton
              size="small"
              variant="outlined"
              onClick={onReset}
              sx={{ width: { xs: '100%', lg: 'auto' } }}
            >
              {resetLabel}
            </AppButton>
          </Box>
        ) : null}
      </Box>
    </Paper>
  );
}
