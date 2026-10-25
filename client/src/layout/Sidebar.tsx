// @ts-nocheck
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
  Divider,
} from "@mui/material";
import Icon from "@mdi/react";
import { mdiMenu, mdiLogout } from "@mdi/js";
import { useAuth } from "../features/auth/useAuth";
import { SIDEBAR_SCREEN_CONFIGS } from "../routing/screenRegistry";
import type { Screen } from "../store/appStore";

interface SidebarProps {
  onNavigate?: (screen: Screen) => void;
  children: React.ReactNode;
  activeRoute: Screen;
}

export default function Sidebar({ onNavigate, children, activeRoute }: SidebarProps) {
  const { logout } = useAuth();
  const [mini, setMini] = useState(false);
  const drawerWidth = mini ? 60 : 240;
  const contentOffset = mini ? drawerWidth : Math.max(drawerWidth - 50, 0);

  const handleLogout = () => {
    logout();
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          width: contentOffset,
          flexShrink: 0,
          transition: "width 0.2s",
        }}
        PaperProps={{
          sx: {
            width: drawerWidth,
            transition: "width 0.2s",
            boxSizing: "border-box",
            bgcolor: "background.paper",
            borderColor: "divider",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            p: "12px",
            gap: "16px",
            transition: "padding 0.2s",
          }}
        >
          <Icon
            path={mdiMenu}
            size={1.3}
            color="currentColor"
            onClick={() => setMini((m) => !m)}
          />
          {!mini && (
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                letterSpacing: 1,
                color: "text.primary",
              }}
            >
              FinanceApp
            </Typography>
          )}
        </Box>
        <List>
          {SIDEBAR_SCREEN_CONFIGS.map(({ key, label, icon }) => {
            const selected = activeRoute === key;
            return (
              <ListItem
                key={key}
                disablePadding
                sx={{ justifyContent: mini ? "center" : "flex-start" }}
              >
                <ListItemButton
                  selected={selected}
                  onClick={() => onNavigate?.(key)}
                  sx={{
                    ...(selected
                      ? {
                          backgroundColor: "action.selected !important",
                          color: "primary.main !important",
                          "& .MuiListItemText-primary": {
                            color: "primary.main !important",
                          },
                          "& .MuiListItemIcon-root": {
                            color: "primary.main !important",
                          },
                        }
                      : {}),
                    "&:hover": {
                      backgroundColor: "action.hover !important",
                      color: "primary.main !important",
                      "& .MuiListItemText-primary": {
                        color: "primary.main !important",
                      },
                      "& .MuiListItemIcon-root": {
                        color: "primary.main !important",
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      justifyContent: "center",
                      mr: !mini ? "12px" : 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Icon path={icon} size={1.3} />
                  </ListItemIcon>
                  {!mini && <ListItemText primary={label} />}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* User info and logout at bottom */}
        <Box sx={{ mt: "auto" }}>
          <Divider />
          <List disablePadding>
            <ListItem
              disablePadding
              sx={{ justifyContent: mini ? "center" : "flex-start" }}
            >
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  py: 1,
                  "&:hover": {
                    backgroundColor: "action.hover !important",
                    color: "primary.main !important",
                    "& .MuiListItemText-primary": {
                      color: "primary.main !important",
                    },
                    "& .MuiListItemIcon-root": {
                      color: "primary.main !important",
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    justifyContent: "center",
                    mr: !mini ? "12px" : 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Icon path={mdiLogout} size={1.3} />
                </ListItemIcon>
                {!mini && <ListItemText primary="Logout" />}
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          pl: 2,
          pr: 2,
          pb: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
