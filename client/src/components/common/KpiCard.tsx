import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  delta?: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  onClick?: () => void;
}

const deltaColorByTone = {
  positive: 'success.main',
  negative: 'error.main',
  neutral: 'text.secondary',
} as const;

export default function KpiCard({ title, value, delta, deltaTone = 'neutral', icon, onClick }: KpiCardProps) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2.25,
        borderRadius: 0.5,
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease' : undefined,
        '&:hover': onClick
          ? {
              transform: 'translateY(-1px)',
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
              borderColor: 'primary.main',
            }
          : undefined,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.75, fontWeight: 700 }}>
            {value}
          </Typography>
          {delta ? (
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: deltaColorByTone[deltaTone], fontWeight: 600 }}>
              {delta}
            </Typography>
          ) : null}
        </Box>
        {icon ? <Box sx={{ color: 'text.secondary' }}>{icon}</Box> : null}
      </Box>
    </Paper>
  );
}
