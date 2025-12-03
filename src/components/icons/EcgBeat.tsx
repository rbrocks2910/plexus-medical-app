/**
 * @file EcgBeat.tsx
 * @description Defines a decorative SVG component that shows a single ECG heartbeat.
 * This is used for aesthetic purposes to reinforce the medical theme of the application,
 * often in combination with animations.
 */
import React from 'react';

export const EcgBeat: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 100 40"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true" // Decorative, so it's hidden from screen readers
  >
    {/* The path defines the shape of the ECG beat. Animations can be applied to this path via CSS. */}
    <path
      className="animate-ecg-beat"
      d="M0,20 H20 L25,10 L30,25 L35,15 L40,20 H100"
    />
  </svg>
);