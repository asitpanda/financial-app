import React, { ReactNode } from 'react';
import Login from '../pages/Login';
import { useAuthStore } from '../store/authStore';

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Login />;
  }

  return <>{children}</>;
}
