import { useEffect } from 'react';
import { alpha, Box, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import Icon from '@mdi/react';
import { mdiAlertOutline } from '@mdi/js';
import AppButton from '../../../components/common/AppButton';

interface IdleTimeoutDialogProps {
  open: boolean;
  secondsLeft: number;
  onStayActive: () => void;
  onLogout: () => void;
}

export default function IdleTimeoutDialog({ open, secondsLeft, onStayActive, onLogout }: IdleTimeoutDialogProps) {
  useEffect(() => {
    if (!open) return;
    const previousTitle = document.title;
    document.title = `Signing out in ${secondsLeft}s - My Financial`;
    return () => { document.title = previousTitle; };
  }, [open, secondsLeft]);

  const announcedSeconds = secondsLeft > 10 ? Math.ceil(secondsLeft / 10) * 10 : secondsLeft;

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      fullWidth
      maxWidth="xs"
      role="alertdialog"
      aria-labelledby="idle-timeout-title"
      aria-describedby="idle-timeout-description"
      slotProps={{
        paper: {
          sx: {
            maxWidth: 420,
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.warning.main, 0.18),
            boxShadow: 8,
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        id="idle-timeout-title"
        component="div"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1,
          minHeight: 50,
          flexShrink: 0,
          backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.1),
          borderBottom: '1px solid',
          borderColor: (theme) => alpha(theme.palette.warning.main, 0.18),
        }}
      >
        <Box component="span" sx={{ color: 'warning.main', display: 'inline-flex', flexShrink: 0 }}>
          <Icon path={mdiAlertOutline} size={1.2} aria-hidden="true" />
        </Box>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 700, letterSpacing: 0 }}>
          Are you still there?
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 3, textAlign: 'center' }}>
        <Typography id="idle-timeout-description" variant="body1" sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.6 }}>
          For your security, you will be signed out due to inactivity.
        </Typography>
        <Typography aria-hidden="true" variant="body2" sx={{ mt: 2, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          Signing out in {secondsLeft} seconds
        </Typography>
        <Box
          component="span"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          sx={{ position: 'absolute', width: '1px', height: '1px', p: 0, m: '-1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}
        >
          Signing out in {announcedSeconds} seconds
        </Box>
      </DialogContent>
      <DialogActions disableSpacing sx={{ px: 3, pb: 2.5, pt: 1, gap: 1.5, flexShrink: 0 }}>
        <AppButton onClick={onLogout} variant="outlined" fullWidth>Sign out now</AppButton>
        <AppButton onClick={onStayActive} color="warning" variant="contained" fullWidth autoFocus>Stay signed in</AppButton>
      </DialogActions>
    </Dialog>
  );
}