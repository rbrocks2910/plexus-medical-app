/**
 * @file schemas.ts
 * @description This file defines the JSON schemas used to structure the output from the Gemini API.
 * This is one of the most critical aspects of the application's architecture. By providing a strict schema
 * with the `responseMimeType: "application/json"` configuration, we force the Gemini model to return
 * valid, predictable JSON. This eliminates the need for fragile string parsing and makes the AI's output
 * reliable and easy to integrate directly into the application's typed data structures.
 */

import { Type } from "@google/genai";

// Schema for generating a patient's profile.
// Ensures the AI creates a patient with all necessary demographic and background information.
// The `description` fields guide the AI on the type of content to generate for each property.
export const patientProfileSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    age: { type: Type.INTEGER },
    gender: { type: Type.STRING, enum: ['Male', 'Female', 'Other'] },
    occupation: { type: Type.STRING },
    background: { type: Type.STRING, description: "A clinically relevant background for the patient. This should include pertinent past medical history, family history, social history (e.g., smoking, occupation), and key details of their lifestyle that could be related to their condition." },
    initialEmotionalState: { type: Type.STRING, description: "A simple emotional state directly related to their symptoms (e.g., anxious about pain, frustrated with symptoms, calm)." }
  },
  required: ['name', 'age', 'gender', 'occupation', 'background', 'initialEmotionalState']
};

// Schema for the patient's initial presenting complaint.
export const presentingComplaintSchema = {
  type: Type.OBJECT,
  properties: {
    chiefComplaint: { type: Type.STRING },
    historyOfPresentingIllness: { type: Type.STRING, description: "A detailed history of the main complaint, as the patient would initially describe it." },
  },
  required: ['chiefComplaint', 'historyOfPresentingIllness']
};

// The master schema for generating a new medical case.
// It nests the patient and complaint schemas and, most importantly, includes the `underlyingDiagnosis`.
// This structure ensures the entire case is generated as a single, cohesive JSON object.
export const medicalCaseSchema = {
    type: Type.OBJECT,
    properties: {
        rarity: { type: Type.STRING, enum: ['Very Common', 'Common', 'Uncommon', 'Rare', 'Very Rare'] },
        patient: patientProfileSchema,
        presentingComplaint: presentingComplaintSchema,
        underlyingDiagnosis: { type: Type.STRING, description: "The final, correct diagnosis for this case." }
    },
    required: ['rarity', 'patient', 'presentingComplaint', 'underlyingDiagnosis']
};

// Schema for generating investigation reports (labs, imaging, etc.).
// It forces a separation between a concise `result` summary and a detailed `interpretation`.
// The descriptions guide the AI on how to format the reports professionally, e.g., using markdown tables for labs.
export const investigationReportSchema = {
    type: Type.OBJECT,
    properties: {
        result: { type: Type.STRING, description: "A concise, one-sentence summary of the key findings. Example: 'Leukocytosis with neutrophilia suggesting infection.' or 'Large opacity in the right upper lobe.'" },
        interpretation: { type: Type.STRING, description: "A full, detailed report adhering to strict formatting guidelines. This should provide objective data without revealing the final diagnosis." }
    },
    required: ['result', 'interpretation']
};

// Schema for the final performance feedback on the FeedbackScreen.
// Each property maps directly to a section in the UI, ensuring all aspects of the user's performance are analyzed and returned in a structured way.
export const caseFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        correctness: { type: Type.STRING, enum: ['Correct', 'Partially Correct', 'Incorrect'] },
        reasoningAnalysis: { type: Type.STRING, description: "A brief analysis of the user's reasoning." },
        whatWentWell: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Positive feedback points." },
        areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Constructive feedback points." },
        keyMissedClues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific clinical clues from the patient's history or investigations the user may have missed." },
        differentialDiagnosisAnalysis: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A structured analysis of the user's differential diagnosis list. Comment on its relevance, breadth, whether the correct diagnosis was included, and point out any critical omissions." },
        finalDiagnosisExplanation: { type: Type.STRING, description: "A detailed explanation of the correct diagnosis and why." }
    },
    required: ['correctness', 'reasoningAnalysis', 'whatWentWell', 'areasForImprovement', 'keyMissedClues', 'differentialDiagnosisAnalysis', 'finalDiagnosisExplanation']
};

// Schema for the AI Guider's advice.
// This structure ensures the advice is always actionable and educational, with a clear separation
// between critique of past actions, a suggestion for the next step, and the clinical rationale behind it.
export const guiderAdviceSchema = {
    type: Type.OBJECT,
    properties: {
        critique: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "A list of 1-3 concise, constructive criticisms about the student's actions so far. Focus on missed clinical clues, inefficient ordering of tests, or gaps in questioning. If the student is doing well, this can be an empty array or a single positive reinforcement statement starting with 'Well done:'."
        },
        suggestion: { 
            type: Type.STRING, 
            description: "A single, direct, and actionable piece of advice for the student's next step." 
        },
        rationale: { 
            type: Type.STRING, 
            description: "A clear, educational explanation for why the suggestion is the most appropriate next step and what it helps to rule in or out."
        }
    },
    required: ['critique', 'suggestion', 'rationale']
};