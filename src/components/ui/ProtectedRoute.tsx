/**
 * @file ProtectedRoute.tsx
 * @description Route wrapper component that requires authentication.
 * Redirects unauthenticated users to the login screen.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingOverlay } from './LoadingOverlay';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Loading messages for route protection
const ROUTE_LOADING_MESSAGES = [
  "Checking authentication...",
  "Verifying credentials...",
  "Loading user session...",
  "Preparing your workspace...",
];

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingOverlay title="Authenticating" messages={ROUTE_LOADING_MESSAGES} />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
};
