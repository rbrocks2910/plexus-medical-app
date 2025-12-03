/**
 * @file GuiderIcons.tsx
 * @description Defines the SVG icon for the AI Guider feature.
 * This icon, representing a lightbulb, serves as a clear visual metaphor for "ideas" or "guidance".
 * It is used on the Guider tab and button to create a recognizable and intuitive entry point for the user to seek help.
 */
import React from 'react';

export const GuiderIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);