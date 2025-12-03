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

  // Check if user is banned
  if (user.isBanned) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-red-600 to-red-800">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8 text-center max-w-md">
          <div className="mb-6">
            <svg className="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">Account Suspended</h2>
            <p className="text-white/80 text-sm mb-4">
              {user.banReason || "Your account has been suspended due to violation of our terms of service."}
            </p>
            {user.banExpiresAt && (
              <p className="text-white/60 text-xs">
                Suspension expires: {user.banExpiresAt.toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-white text-red-600 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-all duration-300"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
};
