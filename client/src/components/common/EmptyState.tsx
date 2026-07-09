import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Button from './AppButton';

interface EmptyStateProps {
  title?: string;
  description?: string;
  text?: string;
  subText?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  linkLabel?: string;
  onLinkAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  text,
  subText,
  icon,
  actionLabel,
  onAction,
  linkLabel,
  onLinkAction,
}: EmptyStateProps) {
  const resolvedTitle = text || title || 'Nothing here yet';
  const resolvedDescription = subText || description;
  const resolvedActionLabel = actionLabel || linkLabel;
  const resolvedAction = onAction || onLinkAction;
  const resolvedActionVariant = actionLabel && onAction ? 'contained' : 'text';

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 5, sm: 6 },
        px: { xs: 2.5, sm: 3 },
        textAlign: 'center',
        border: '1px dashed',
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.18),
        borderRadius: 3,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -42,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: (theme) => `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 68%)`,
          pointerEvents: 'none',
        }}
      />

      {/* <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 2,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '20px',
          color: 'primary.main',border: '1px solid',
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.16),
        }}
      >
        {icon || (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '2px solid currentColor',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 6,
                borderRadius: '50%',
                backgroundColor: 'currentColor',
                opacity: 0.18,
              },
            }}
          />
        )}
      </Box> */}

      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {resolvedTitle}
      </Typography>
      {resolvedDescription ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, maxWidth: 420, mx: 'auto', lineHeight: 1.65 }}
        >
          {resolvedDescription}
        </Typography>
      ) : null}
      {resolvedActionLabel && resolvedAction ? (
        <Button
          variant={resolvedActionVariant}
          onClick={resolvedAction}
          sx={{ mt: 2.5, fontWeight: resolvedActionVariant === 'text' ? 600 : undefined }}
        >
          {resolvedActionLabel}
        </Button>
      ) : null}
    </Box>
  );
}
