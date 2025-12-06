/**
 * @file PlexusLogo.tsx
 * @description Defines a reusable SVG component for the Plexus application logo.
 * Centralizing the logo as a React component ensures brand consistency across the app
 * and makes it easy to update if the design changes. It can be easily styled via the `className` prop.
 */
import React from 'react';

export const PlexusLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-label="Plexus Logo"
    role="img"
  >
    <path
      d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88Z"
    />
    <path
      d="M168 88a40 40 0 1 0-40 40h-8a48 48 0 1 0 48-48Z"
      opacity="0.2"
    />
    <path
      d="M168 88a40 40 0 0 0-71.13 28.87A40 40 0 0 0 88 168a40.35 40.35 0 0 0 10.27-1.57l1.1-.33.34-1.09a40 40 0 0 0 38.86-55.18l.34-1.09-1.09-.34A40 40 0 0 0 168 88Zm-40 56a24 24 0 1 1 24-24a24 24 0 0 1-24 24Z"
    />
  </svg>
);