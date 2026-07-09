import React from 'react';
import { Box, Drawer, IconButton, Typography } from '@mui/material';
import Icon from '@mdi/react';
import { mdiClose } from '@mdi/js';

interface AppDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  width?: number;
  closeIconPath?: string;
  closeIconSize?: number;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AppDrawer({
  open,
  title,
  subtitle,
  width = 520,
  closeIconPath = mdiClose,
  closeIconSize = 0.9,
  onClose,
  children,
  footer,
}: AppDrawerProps) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: width }, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
              {subtitle ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {subtitle}
                </Typography>
              ) : null}
            </Box>
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close drawer"
              sx={{
                width: 36,
                height: 36,
                mt: 0.25,
                color: 'text.secondary',
              }}
            >
              <Icon path={closeIconPath} size={closeIconSize} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>{children}</Box>

        {footer ? <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>{footer}</Box> : null}
      </Box>
    </Drawer>
  );
}
