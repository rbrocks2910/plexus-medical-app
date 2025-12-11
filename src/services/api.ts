/**
 * @file api.ts
 * @description This file is the central service layer for all client-side communication with the secure backend API.
 * It abstracts the `fetch` calls into clean, reusable functions, making the component logic simpler and easier to manage.
 * It also provides robust error handling and a fallback to dummy data, ensuring the application remains functional
 * even if the backend services are unavailable.
 */

import {
  MedicalCase,
  Specialty,
  RaritySelection,
  ChatMessage,
  PatientProfile,
  InvestigationResult,
  CaseFeedback,
} from '../types';
import { getDummyCase } from './dummyData';
import { auth } from './firebase';

/**
 * Generates a patient case by calling the `/api/generateCase` endpoint.
 * @param specialty - The specialty selected by the user.
 * @param rarity - The case rarity selected by the user.
 * @param recentDiagnoses - A list of recent diagnoses to avoid repetition.
 * @returns A promise that resolves to a fully formed MedicalCase object.
 */
export const generatePatientCase = async (
  specialty: Specialty,
  rarity: RaritySelection,
  recentDiagnoses: string[] = []
): Promise<MedicalCase> => {
  try {
    // Get the Firebase ID token for authentication
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to generate cases');
    }
    const idToken = await currentUser.getIdToken();

    const response = await fetch('/api/generateCase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ specialty, rarity, recentDiagnoses }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Server returned an invalid response.' }));
      throw new Error(errorData.error || 'Unknown API error during case generation.');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching from /api/generateCase:", error);
    console.log("Using dummy case data as a fallback.");
    return getDummyCase(specialty, rarity);
  }
};

/**
 * Gets a contextual, role-played response from the AI patient by calling the `/api/getChatResponse` endpoint.
 * @param chatHistory - The full conversation history to provide context.
 * @param patient - The patient's profile.
 * @param diagnosis - The secret underlying diagnosis.
 * @returns A promise that resolves to an object containing the response text and the patient's emotional state.
 */
export const getChatResponse = async (
  chatHistory: ChatMessage[],
  patient: PatientProfile,
  diagnosis: string
): Promise<{ text: string; emotionalState: string }> => {
  try {
    // Get the Firebase ID token for authentication
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to get chat responses');
    }
    const idToken = await currentUser.getIdToken();

    const response = await fetch('/api/getChatResponse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ chatHistory, patient, diagnosis }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ text: 'Server returned an invalid response.' }));
      throw new Error(errorData.text || 'Unknown API error during chat.');
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching from /api/getChatResponse:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown network error occurred."
    return {
      text: `I'm sorry, I feel a bit confused right now. There might be a connection issue. (${errorMessage})`,
      emotionalState: "Confused"
    };
  }
};

/**
 * Generates a result for a given clinical investigation by calling the `/api/getInvestigationResult` endpoint.
 * @param testName - The name of the test requested by the user.
 * @param medicalCase - The full data of the current case.
 * @returns A promise that resolves to an `InvestigationResult` object.
 */
export const getInvestigationResult = async (
  testName: string,
  medicalCase: MedicalCase
): Promise<InvestigationResult> => {
  try {
    // Get the Firebase ID token for authentication
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to get investigation results');
    }
    const idToken = await currentUser.getIdToken();

    const response = await fetch('/api/getInvestigationResult', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ testName, medicalCase }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ interpretation: 'Server returned an invalid response.' }));
      throw new Error(errorData.interpretation || 'Unknown API error while generating report.');
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching from /api/getInvestigationResult for "${testName}":`, error);
    const errorMessage = error instanceof Error ? error.message : "Please try again later.";
    return {
      testName,
      result: 'Error Generating Report',
      interpretation: `An error occurred while communicating with the server. ${errorMessage}`,
    };
  }
};

/**
 * Generates structured feedback by calling the `/api/getCaseFeedback` endpoint.
 * @returns A promise that resolves to a `CaseFeedback` object.
 */
export const getCaseFeedback = async (
  medicalCase: MedicalCase,
  userDiagnosis: string,
  userConfidence: number,
  chatHistory: ChatMessage[],
  differentialDiagnoses: string[]
): Promise<CaseFeedback> => {
  try {
    // Get the Firebase ID token for authentication
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to get case feedback');
    }
    const idToken = await currentUser.getIdToken();

    const response = await fetch('/api/getCaseFeedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ medicalCase, userDiagnosis, userConfidence, chatHistory, differentialDiagnoses }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ reasoningAnalysis: 'Server returned an invalid response.' }));
      throw new Error(errorData.reasoningAnalysis || 'Unknown API error during feedback generation.');
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching from /api/getCaseFeedback:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred."
    return {
      correctness: 'Partially Correct',
      reasoningAnalysis: `An error occurred while generating feedback: ${errorMessage}`,
      whatWentWell: [],
      areasForImprovement: ['Check application logs for API errors.'],
      keyMissedClues: [],
      differentialDiagnosisAnalysis: ['Could not analyze differential diagnosis list due to a server error.'],
      finalDiagnosisExplanation: `The correct diagnosis was ${medicalCase.underlyingDiagnosis}.`
    };
  }
};

/**
 * Fetches advice from the AI Guider by calling the `/api/getGuiderAdvice` endpoint.
 * @returns A promise that resolves to a structured advice object.
 */
export const getGuiderAdvice = async (
  medicalCase: MedicalCase,
  chatHistory: ChatMessage[],
  investigations: InvestigationResult[],
  differentialDiagnoses: string[]
): Promise<{ critique: string[]; suggestion: string; rationale: string }> => {
  try {
    // Get the Firebase ID token for authentication
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to get guider advice');
    }
    const idToken = await currentUser.getIdToken();

    const response = await fetch('/api/getGuiderAdvice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ medicalCase, chatHistory, investigations, differentialDiagnoses }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ rationale: 'Server returned an invalid response.' }));
      throw new Error(errorData.rationale || 'Unknown API error while getting guidance.');
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching from /api/getGuiderAdvice:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown network error occurred."
    return {
      critique: ["An error occurred while fetching guidance."],
      suggestion: "Error Fetching Guidance",
      rationale: `Could not connect to the guidance AI. ${errorMessage}`
    };
  }
};