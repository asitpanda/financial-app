import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import EmptyState from './EmptyState';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
  empty?: boolean;
  emptyState?: React.ComponentProps<typeof EmptyState>;
}

export default function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  contentClassName,
  sx,
  contentSx,
  empty = false,
  emptyState,
}: SectionCardProps) {
  return (
    <Paper variant="outlined" className={className} sx={{ borderRadius: 0.5, p: 2.0, ...sx }}>
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
      <Box className={contentClassName} sx={contentSx}>
        {empty ? <EmptyState {...emptyState} /> : children}
      </Box>
    </Paper>
  );
}
