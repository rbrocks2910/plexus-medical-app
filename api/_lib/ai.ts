/**
 * @file ai.ts
 * @description This file is responsible for initializing and exporting the Google GenAI client instance for server-side use.
 * It ensures the API key is loaded securely from environment variables.
 */
import { GoogleGenAI } from "@google/genai";

// CRITICAL: The API key is sourced from environment variables, checking both documented and legacy names for compatibility
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
    throw new Error("No API key found. Please set either GEMINI_API_KEY (recommended) or API_KEY environment variable.");
}

export const ai = new GoogleGenAI({ apiKey });