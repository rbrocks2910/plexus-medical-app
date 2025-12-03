/**
 * @file App.tsx
 * @description This is the root component of the Plexus application.
 * It sets up the global context provider and defines the application's routing structure.
 *
 * Core Responsibilities:
 * 1.  **Global State (`AppProvider`):** It wraps the entire application with the `AppProvider` component.
 *     This makes the global state (managed in `AppContext.tsx`) available to all components
 *     in the application tree, such as `HomeScreen`, `CaseScreen`, etc.
 *
 * 2.  **Routing (`HashRouter`, `Routes`, `Route`):** It uses `react-router-dom` to manage navigation.
 *     - `HashRouter` is used for client-side routing that works well in environments where server-side
 *       configuration is not available (like simple static hosting). It uses the URL hash (`#`) to keep
 *       the UI in sync with the URL.
 *     - `Routes` acts as a container for all possible routes.
 *     - `Route` defines a single navigation path, mapping a URL pattern (`path`) to a specific
 *       React component (`element`). This determines which "screen" is visible to the user.
 *     - A wildcard route (`path="*"`) is included to redirect any unknown URLs back to the home page,
 *       preventing users from seeing a blank or broken page.
 */
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { HomeScreen } from './components/screens/HomeScreen';
import { CaseScreen } from './components/screens/CaseScreen';
import { FeedbackScreen } from './components/screens/FeedbackScreen';

const App: React.FC = () => {
  return (
    // The AppProvider makes the global state accessible to all child components.
    <AppProvider>
      {/* HashRouter manages the client-side routing. */}
      <HashRouter>
        {/* The Routes component wraps all the individual Route definitions. */}
        <Routes>
          {/* Route for the landing page. */}
          <Route path="/" element={<HomeScreen />} />
          
          {/* Route for the main simulation screen. `:caseId` is a URL parameter that will be available
              to the CaseScreen component, allowing it to fetch the correct case data. */}
          <Route path="/case/:caseId" element={<CaseScreen />} />
          
          {/* Route for the feedback screen, also using the `caseId` parameter. */}
          <Route path="/feedback/:caseId" element={<FeedbackScreen />} />
          
          {/* Fallback route to redirect any unmatched URLs to the home page. */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  );
};

export default App;