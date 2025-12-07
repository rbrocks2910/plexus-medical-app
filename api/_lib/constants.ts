/**
 * @file constants.ts (API version)
 * @description This file centralizes constant values used by the serverless functions.
 */

// A structured object containing predefined investigation options categorized by type.
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
export type InvestigationType = 'lab' | 'imaging' | 'exam';

/**
 * A utility function to determine the type of an investigation based on its name.
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
  const imagingKeywords = ['x-ray', 'cxr', 'ct scan', 'ultrasound', 'mri', 'ecg', 'echo', 'tomography', 'gram'];
  if (imagingKeywords.some(keyword => loweredTestName.includes(keyword))) {
    return 'imaging';
  }
  const examKeywords = ['exam', 'auscultation', 'palpation', 'examination', 'status'];
  if (examKeywords.some(keyword => loweredTestName.includes(keyword))) {
      return 'exam';
  }

  // Step 3: Default to 'lab'.
  return 'lab';
};