/**
 * @file Spinner.tsx
 * @description Defines a simple, reusable loading spinner component.
 * This component provides consistent visual feedback to the user whenever an asynchronous
 * action is in progress (e.g., API calls). It is customizable in size via props,
 * making it versatile for use in different contexts, from small inline indicators to large full-page overlays.
 */
import React from 'react';

// Defines the props, allowing for size and additional custom styling.
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  // A map of size props to corresponding Tailwind CSS classes.
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-4',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      // The `animate-spin` class powers the rotation animation.
      // The border styles create the classic "spinner" look with a transparent top border segment.
      className={`${sizeClasses[size]} animate-spin rounded-full border-solid border-plexus-accent border-t-transparent ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};