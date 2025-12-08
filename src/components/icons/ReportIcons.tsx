/**
 * @file ReportIcons.tsx
 * @description Defines a set of SVG icons used to visually represent different categories of clinical investigations.
 * These icons are used in the 'Order' tab and the `ReportViewer` to provide quick, at-a-glance identification
 * of whether a test is a lab, imaging study, or physical exam, which enhances the user interface's clarity and usability.
 */
import React from 'react';

// Icon for Laboratory tests. Represents a test tube.
export const LabIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2" />
    <path d="M8.5 2h7" />
    <path d="M14.5 16h-5" />
  </svg>
);

// Icon for Imaging studies. Represents a film from a scan.
export const ImagingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2" />
    <path d="M2 12h20" />
    <path d="M12 3v18" />
  </svg>
);

// Icon for Physical Exams. Represents a stethoscope.
export const ExamIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 00-12 0v2h12v-2z" />
    <path d="M6 10v1a6 6 0 0012 0v-1" />
    <path d="M12 11v10" />
    <path d="M12 21a2 2 0 100-4 2 2 0 000 4z" />
  </svg>
);