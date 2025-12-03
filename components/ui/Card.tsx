/**
 * @file Card.tsx
 * @description Defines a reusable Card component.
 * This component is a foundational UI element in Plexus, used to wrap content in a visually distinct,
 * styled container. It standardizes the look of panels, modals, and info boxes across the app.
 *
 * Features:
 * - Provides a consistent background color, rounding, and shadow (`shadow-plexus`).
 * - Includes a subtle hover effect (`hover:shadow-plexus-lg`) to give users interactive feedback.
 * - Is highly reusable and customizable via the `className` prop, allowing for additional Tailwind classes
 *   to be applied without altering the base component.
 * - Accepts all standard HTML div attributes (`...props`) for maximum flexibility.
 */
import React from 'react';

// Defines the props for the Card component, extending standard HTML div attributes.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      {...props}
      // The core styling is applied here. It combines base styles with any custom classes passed in.
      // `bg-white`, `rounded-xl`, `shadow-plexus`: These define the card's basic appearance.
      // `overflow-hidden`: Ensures that child content with sharp corners doesn't break the rounded border.
      // `p-6`: Provides consistent internal padding.
      // `hover:shadow-plexus-lg transition-shadow duration-300 ease-plexus-ease`: Defines the smooth shadow transition on hover.
      className={`bg-white rounded-xl shadow-plexus overflow-hidden p-6 hover:shadow-plexus-lg transition-shadow duration-300 ease-plexus-ease ${className}`}
    >
      {children}
    </div>
  );
};
