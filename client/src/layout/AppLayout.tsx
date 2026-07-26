import React from 'react';
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
      {children}
    </Sidebar>
  );
}
