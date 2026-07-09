import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  alpha,
} from '@mui/material';
import AppButton from '../common/AppButton';
import Icon from '@mdi/react';
import {
  mdiAlertCircleOutline,
  mdiAlertOutline,
  mdiCheckCircleOutline,
  mdiClose,
  mdiDeleteOutline,
  mdiInformationOutline,
} from '@mdi/js';
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'error' | 'primary' | 'success' | 'warning' | 'info';
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DIALOG_TONE_META = {
  error: {
    icon: mdiDeleteOutline,
    iconColor: '#ef4444',
    iconBg: (theme: any) => alpha(theme.palette.error.main, 0.1),
    headerBg: (theme: any) => alpha(theme.palette.error.main, 0.08),
    borderColor: (theme: any) => alpha(theme.palette.error.main, 0.16),
  },
  warning: {
    icon: mdiAlertOutline,
    iconColor: '#f59e0b',
    iconBg: (theme: any) => alpha(theme.palette.warning.main, 0.12),
    headerBg: (theme: any) => alpha(theme.palette.warning.main, 0.1),
    borderColor: (theme: any) => alpha(theme.palette.warning.main, 0.18),
  },
  success: {
    icon: mdiCheckCircleOutline,
    iconColor: '#10b981',
    iconBg: (theme: any) => alpha(theme.palette.success.main, 0.12),
    headerBg: (theme: any) => alpha(theme.palette.success.main, 0.1),
    borderColor: (theme: any) => alpha(theme.palette.success.main, 0.16),
  },
  info: {
    icon: mdiInformationOutline,
    iconColor: '#3b82f6',
    iconBg: (theme: any) => alpha(theme.palette.info.main, 0.12),
    headerBg: (theme: any) => alpha(theme.palette.info.main, 0.1),
    borderColor: (theme: any) => alpha(theme.palette.info.main, 0.16),
  },
  primary: {
    icon: mdiAlertCircleOutline,
    iconColor: '#2563eb',
    iconBg: (theme: any) => alpha(theme.palette.primary.main, 0.12),
    headerBg: (theme: any) => alpha(theme.palette.primary.main, 0.1),
    borderColor: (theme: any) => alpha(theme.palette.primary.main, 0.16),
  },
} as const;

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'error',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const toneMeta = DIALOG_TONE_META[confirmColor];

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      aria-labelledby="confirm-dialog-title"
      sx={{
        '& .MuiDialog-paper': {
          width: '100%',
          maxWidth: 420,
          pd: 0,
          border: '1px solid',
          borderColor: toneMeta.borderColor,
          boxShadow: '0 18px 48px rgba(15, 23, 42, 0.12)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        id="confirm-dialog-title"
        sx={{
          padding: 1,
          height: 50,
          backgroundColor: toneMeta.headerBg,
          borderBottom: '1px solid',
          borderColor: toneMeta.borderColor,
          m: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              minWidth: 0,
            }}
          >
            <Box
              // sx={{
              //   width: 48,
              //   height: 48,
              //   flexShrink: 0,
              //   borderRadius: '50%',
              //   display: 'grid',
              //   placeItems: 'center',
              //   backgroundColor: toneMeta.iconBg,
              // }}
            >
              <Icon path={toneMeta.icon} size={1.2} color={toneMeta.iconColor} />
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: -0.2 }}>
              {title}
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={loading ? undefined : onCancel}
            disabled={loading}
            aria-label="Close dialog"
            sx={{ color: 'text.secondary', flexShrink: 0 }}
          >
            <Icon path={mdiClose} size={0.9} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3, textAlign: 'center' }}>
        <Typography
          variant="body1"
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
          }}
        >
          {description}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1.5 }}>
        <AppButton onClick={onCancel} disabled={loading} variant="outlined" fullWidth>
          {cancelLabel}
        </AppButton>
        <AppButton
          color={confirmColor}
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          fullWidth
        >
          {confirmLabel}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
