import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export default function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 0.5, p: 2.0 }}>
      {(title || subtitle || action) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box>
            {title ? (
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action ? <Box>{action}</Box> : null}
        </Box>
      )}
      {children}
    </Paper>
  );
}
