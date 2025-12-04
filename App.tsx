/**
 * @file App.tsx
 * @description This is the root component of the Plexus application.
 * It sets up the authentication provider, global context provider, and defines the application's routing structure.
 *
 * Core Responsibilities:
 * 1.  **Authentication (`AuthProvider`):** Handles user authentication with Google OAuth,
 *     rate limiting, and user session management.
 *
 * 2.  **Global State (`AppProvider`):** It wraps the authenticated application with the `AppProvider` component.
 *     This makes the global state (managed in `AppContext.tsx`) available to all components
 *     in the application tree, such as `HomeScreen`, `CaseScreen`, etc.
 *
 * 3.  **Routing (`HashRouter`, `Routes`, `Route`):** It uses `react-router-dom` to manage navigation.
 *     - `HashRouter` is used for client-side routing that works well in environments where server-side
 *       configuration is not available (like simple static hosting). It uses the URL hash (`#`) to keep
 *       the UI in sync with the URL.
 *     - `Routes` acts as a container for all possible routes.
 *     - `Route` defines a single navigation path, mapping a URL pattern (`path`) to a specific
 *       React component (`element`). This determines which "screen" is visible to the user.
 *     - Protected routes require authentication and redirect to `/login` if not authenticated.
 *     - A wildcard route (`path="*"`) is included to redirect any unknown URLs back to the home page,
 *       preventing users from seeing a blank or broken page.
 */
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { LoginScreen } from './src/components/screens/LoginScreen';
import { HomeScreen } from './src/components/screens/HomeScreen';
import { CaseScreen } from './src/components/screens/CaseScreen';
import { FeedbackScreen } from './src/components/screens/FeedbackScreen';
import { ProtectedRoute } from './src/components/ui/ProtectedRoute';

const App: React.FC = () => {
  return (
    // The AuthProvider handles user authentication and must wrap everything
    <AuthProvider>
      {/* The AppProvider makes the global state accessible to all child components. */}
      <AppProvider>
        {/* HashRouter manages the client-side routing. */}
        <HashRouter>
          {/* The Routes component wraps all the individual Route definitions. */}
          <Routes>
            {/* Public login route */}
            <Route path="/login" element={<LoginScreen />} />

            {/* Protected routes - require authentication */}
            <Route path="/" element={
              <ProtectedRoute>
                <HomeScreen />
              </ProtectedRoute>
            } />

            {/* Route for the main simulation screen. `:caseId` is a URL parameter that will be available
                to the CaseScreen component, allowing it to fetch the correct case data. */}
            <Route path="/case/:caseId" element={
              <ProtectedRoute>
                <CaseScreen />
              </ProtectedRoute>
            } />

            {/* Route for the feedback screen, also using the `caseId` parameter. */}
            <Route path="/feedback/:caseId" element={
              <ProtectedRoute>
                <FeedbackScreen />
              </ProtectedRoute>
            } />

            {/* Fallback route to redirect any unmatched URLs to the home page. */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </HashRouter>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
