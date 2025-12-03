/**
 * @file constants.ts
 * @description This file centralizes constant values used throughout the application.
 * Storing constants here prevents "magic strings" and numbers in the codebase, making the app
 * easier to maintain, update, and understand. It provides a single source of truth for static data.
 */

import { RaritySelection, Specialty } from './types';

// An array of all available medical specialties.
// This constant is used to populate the specialty selection modal on the HomeScreen,
// ensuring that the UI is always in sync with the defined `Specialty` enum.
export const SPECIALTIES: Specialty[] = [
  Specialty['General Medicine'],
  Specialty.Cardiology,
  Specialty.Pulmonology,
  Specialty.Gastroenterology,
  Specialty.Neurology,
  Specialty.Dermatology,
  Specialty.Endocrinology,
  Specialty.Nephrology,
  Specialty.Oncology,
  Specialty.Rheumatology,
  Specialty.Psychiatry,
  Specialty['Infectious Disease'],
  Specialty.Hematology,
  Specialty.Orthopedics,
];

// An array of all available case rarity levels for user selection.
// This constant populates the rarity slider on the HomeScreen.
export const RARITY_LEVELS: RaritySelection[] = ['Any', 'Very Common', 'Common', 'Uncommon', 'Rare', 'Very Rare'];

// A structured object containing predefined investigation options categorized by type.
// This data populates the 'Order' tab on the CaseScreen, providing users with a list of common tests.
// It also allows for easy extension with new tests in the future.
export const INVESTIGATION_OPTIONS = {
  labs: [
    'Complete Blood Count (CBC)', 
    'Basic Metabolic Panel (BMP)', 
    'Liver Function Tests (LFT)', 
    'Serum Electrolytes',
    'C-Reactive Protein (CRP)',
    'Urinalysis',
    'Thyroid Stimulating Hormone (TSH)',
    'Blood Culture',
  ],
  imaging: [
    'Chest X-Ray (CXR)', 
    'CT Scan of Head', 
    'Abdominal Ultrasound', 
    'ECG',
    'MRI of Spine',
    'Echocardiogram',
  ],
  exams: [
    'Cardiac Auscultation', 
    'Respiratory Exam', 
    'Neurological Exam', 
    'Abdominal Palpation',
    'Skin Lesion Examination',
    'Mental Status Examination',
  ],
};

// A type definition for the categories of investigations.
// This is used to ensure type safety when dealing with investigation types.
export type InvestigationType = 'lab' | 'imaging' | 'exam';

/**
 * A utility function to determine the type of an investigation based on its name.
 * This is crucial for the `ReportViewer` component, which uses the type to render the report
 * in the correct format (e.g., a table for labs, an image viewer for imaging).
 * It supports both predefined tests from `INVESTIGATION_OPTIONS` and custom user-entered tests.
 * @param testName The name of the investigation to categorize.
 * @returns The determined InvestigationType ('lab', 'imaging', or 'exam').
 */
export const getInvestigationType = (testName: string): InvestigationType => {
  const loweredTestName = testName.toLowerCase();

  // Step 1: Check against predefined lists for a quick and exact match. This is the most reliable method.
  if (INVESTIGATION_OPTIONS.imaging.some(term => term.toLowerCase() === loweredTestName)) {
    return 'imaging';
  }
  if (INVESTIGATION_OPTIONS.exams.some(term => term.toLowerCase() === loweredTestName)) {
    return 'exam';
  }

  // Step 2: If it's a custom test not in the lists, infer the type based on common keywords.
  // This provides flexibility for user-defined investigations.
  const imagingKeywords = ['x-ray', 'cxr', 'ct scan', 'ultrasound', 'mri', 'ecg', 'echo', 'tomography', 'gram'];
  if (imagingKeywords.some(keyword => loweredTestName.includes(keyword))) {
    return 'imaging';
  }
  const examKeywords = ['exam', 'auscultation', 'palpation', 'examination', 'status'];
  if (examKeywords.some(keyword => loweredTestName.includes(keyword))) {
      return 'exam';
  }

  // Step 3: Default to 'lab'. This is a reasonable fallback as most other medical tests
  // (e.g., blood tests, cultures, serology) fall under the laboratory category.
  return 'lab';
};