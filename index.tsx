/**
 * @file index.tsx
 * @description This is the primary entry point for the Plexus React application.
 * Its main responsibilities are:
 * 1. Importing the root React component, `App`.
 * 2. Finding the `div` with the ID 'root' in the `index.html` file.
 * 3. Using `ReactDOM.createRoot` to create a modern concurrent React root.
 * 4. Rendering the entire application into that root element.
 * This setup is standard for modern React applications and initializes the virtual DOM.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error handling to catch initialization errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  console.error('Error message:', event.message);
  console.error('Error source:', event.filename);
  console.error('Error line:', event.lineno);
  console.error('Error column:', event.colno);

  // If possible, show error on screen
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '10px';
  errorDiv.style.left = '10px';
  errorDiv.style.backgroundColor = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '10px';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.fontSize = '14px';
  errorDiv.innerHTML = `
    <div><strong>Application Error:</strong></div>
    <div>${event.error?.message || event.message || 'Unknown error'}</div>
    <div>Check browser console for details</div>
  `;

  document.body.appendChild(errorDiv);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);

  // If possible, show error on screen
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '10px';
  errorDiv.style.left = '10px';
  errorDiv.style.backgroundColor = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '10px';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.fontSize = '14px';
  errorDiv.innerHTML = `
    <div><strong>Unhandled Promise Rejection:</strong></div>
    <div>${event.reason?.message || 'Unknown error'}</div>
    <div>Check browser console for details</div>
  `;

  document.body.appendChild(errorDiv);
});

try {
  // Step 1: Locate the root DOM element.
  // This element is defined in `index.html` and serves as the container for the entire React app.
  // If this element isn't found, the app cannot be mounted, so we throw an error for immediate debugging.
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  // Step 2: Create a React root.
  // `ReactDOM.createRoot` is the modern API for creating a root, enabling concurrent features
  // which improve performance and responsiveness of the application.
  const root = ReactDOM.createRoot(rootElement);

  // Step 3: Render the application.
  // `root.render()` is called to render the `App` component into the `rootElement`.
  // <React.StrictMode> is a development tool that highlights potential problems in an application.
  // It activates additional checks and warnings for its descendants but does not render any visible UI.
  // This helps in identifying unsafe lifecycles, legacy API usage, and other issues early in development.
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Error initializing app:", error);

  // Show error on screen if initialization fails
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '10px';
  errorDiv.style.left = '10px';
  errorDiv.style.backgroundColor = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '10px';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.fontSize = '14px';
  errorDiv.innerHTML = `
    <div><strong>Initialization Error:</strong></div>
    <div>${error.message || 'Unknown initialization error'}</div>
    <div>Check browser console for details</div>
  `;

  document.body.appendChild(errorDiv);
}
