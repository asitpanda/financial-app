import React, { useState } from "react";
import { 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  ListItemIcon, 
  Drawer, 
  Typography, 
  Box, 
  Divider 
} from "@mui/material";
import Icon from '@mdi/react';
import { mdiViewDashboard, mdiFileDocument, mdiFlag, mdiShape, mdiChartBar, mdiCog, mdiMenu, mdiLogout } from '@mdi/js';
import { colors } from '../colors';
import { useAuthStore } from '../store/authStore';

const links = [
  { name: "Dashboard", icon: mdiViewDashboard },
  { name: "Transactions", icon: mdiFileDocument },
  { name: "Goals", icon: mdiFlag },
  { name: "Categories", icon: mdiShape },
  { name: "Investments", icon: mdiChartBar },
  { name: "Settings", icon: mdiCog },
];

export default function Sidebar({ onNavigate, children, activeRoute }) {
  const { logout } = useAuthStore();
  const [mini, setMini] = useState(false);
  const drawerWidth = mini ? 60 : 240;
  const contentOffset = mini ? drawerWidth : Math.max(drawerWidth - 50, 0);

  const handleLogout = () => {
    logout();
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: colors.background }}>
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          width: contentOffset,
          flexShrink: 0,
          transition: 'width 0.2s',
        }}
        PaperProps={{
          sx: {
            width: drawerWidth,
            transition: 'width 0.2s',
            boxSizing: 'border-box',
            bgcolor: colors.sidebarBg,
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start',  p: '12px', gap: '16px', transition: 'padding 0.2s' }}>
          <Icon path={mdiMenu} size={1.3} color={colors.primary} onClick={() => setMini((m) => !m)} />
          {!mini && (
            <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center', letterSpacing: 1, color: colors.sidebarText }}>
              FinanceApp
            </Typography>
          )}
        </Box>
        <List>
          {links.map(({ name, icon }) => {
            const route = name.toLowerCase();
            const selected = activeRoute === route;
            return (
              <ListItem key={name} disablePadding sx={{ justifyContent: mini ? 'center' : 'flex-start' }}>
                <ListItemButton
                  selected={selected}
                  onClick={() => onNavigate?.(route)}
                  sx={{
                    ...(selected
                      ? {
                          backgroundColor: colors.sidebarActiveBg + ' !important',
                          color: colors.sidebarActiveText + ' !important',
                          '& .MuiListItemText-primary': { color: colors.sidebarActiveText + ' !important' },
                          '& .MuiListItemIcon-root': { color: colors.sidebarActiveText + ' !important' },
                        }
                      : {}),
                    '&:hover': {
                      backgroundColor: colors.sidebarHoverBg + ' !important',
                      color: colors.sidebarActiveText + ' !important',
                      '& .MuiListItemText-primary': { color: colors.sidebarActiveText + ' !important' },
                      '& .MuiListItemIcon-root': { color: colors.sidebarActiveText + ' !important' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', mr: !mini ? '12px' : 0, display: 'flex', alignItems: 'center' }}>
                    <Icon path={icon} size={1.3} />
                  </ListItemIcon>
                  {!mini && <ListItemText primary={name} />}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* User info and logout at bottom */}
        <Box sx={{ mt: 'auto' }}>
          <Divider />
          <List disablePadding>
            <ListItem disablePadding sx={{ justifyContent: mini ? 'center' : 'flex-start' }}>
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  py: 1,
                  '&:hover': {
                    backgroundColor: colors.sidebarHoverBg + ' !important',
                    color: colors.sidebarActiveText + ' !important',
                    '& .MuiListItemText-primary': { color: colors.sidebarActiveText + ' !important' },
                    '& .MuiListItemIcon-root': { color: colors.sidebarActiveText + ' !important' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', mr: !mini ? '12px' : 0, display: 'flex', alignItems: 'center' }}>
                  <Icon path={mdiLogout} size={1.3} />
                </ListItemIcon>
                {!mini && <ListItemText primary="Logout" />}
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, pl: 2, pr: 2, pb: 2, height: '100%' }}>
        {children}
      </Box>
    </Box>
  );
}
