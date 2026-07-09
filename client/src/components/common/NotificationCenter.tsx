import React from 'react';
import { Alert, Snackbar, Stack } from '@mui/material';
import { useNotificationStore } from '../../store/notificationStore';

export default function NotificationCenter() {
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1700,
        width: { xs: 'calc(100% - 32px)', sm: 360 },
      }}
    >
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={notification.autoHideMs ?? 3000}
          onClose={() => removeNotification(notification.id)}
        >
          <Alert
            severity={notification.type}
            variant="filled"
            onClose={() => removeNotification(notification.id)}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
}
