/**
 * @file types.ts
 * @description This file serves as the single source of truth for all data structures and type definitions used across the server-side functions.
 */

export type CaseRarity = 'Very Common' | 'Common' | 'Uncommon' | 'Rare' | 'Very Rare';
export type RaritySelection = CaseRarity | 'Any';

export enum Specialty {
  'General Medicine' = 'General Medicine',
  Cardiology = 'Cardiology',
  Pulmonology = 'Pulmonology',
  Gastroenterology = 'Gastroenterology',
  Neurology = 'Neurology',
  Dermatology = 'Dermatology',
  Endocrinology = 'Endocrinology',
  Nephrology = 'Nephrology',
  Oncology = 'Oncology',
  Rheumatology = 'Rheumatology',
  Psychiatry = 'Psychiatry',
  'Infectious Disease' = 'Infectious Disease',
  Hematology = 'Hematology',
  Orthopedics = 'Orthopedics',
}

export interface PatientProfile {
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  occupation: string;
  background: string;
  initialEmotionalState: string;
}

export interface PresentingComplaint {
  chiefComplaint: string;
  historyOfPresentingIllness: string;
}

export interface MedicalCase {
  id: string;
  rarity: CaseRarity;
  specialty: Specialty;
  patient: PatientProfile;
  presentingComplaint: PresentingComplaint;
  underlyingDiagnosis: string;
  status: 'active' | 'completed';
}

export interface ChatMessage {
  sender: 'user' | 'patient';
  text: string;
  timestamp: string;
  emotionalState?: string;
}

export interface InvestigationResult {
  testName: string;
  result: string;
  imageUrl?: string;
  interpretation?: string;
}

export interface CaseFeedback {
  correctness: 'Correct' | 'Partially Correct' | 'Incorrect';
  reasoningAnalysis: string;
  whatWentWell: string[];
  areasForImprovement: string[];
  keyMissedClues: string[];
  finalDiagnosisExplanation: string;
  differentialDiagnosisAnalysis: string[];
}