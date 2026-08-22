import React from 'react';
import { Box } from '@mui/material';
import Sidebar from '../features/layout/components/Sidebar';
import Header from './Header';
import type { Screen } from '../store/appStore';

interface AppLayoutProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  children: React.ReactNode;
}

export default function AppLayout({ activeScreen, onNavigate, children }: AppLayoutProps) {
  return (
    <Sidebar onNavigate={onNavigate} activeRoute={activeScreen}>
      <Header activeScreen={activeScreen} />
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {children}
      </Box>
    </Sidebar>
  );
}
