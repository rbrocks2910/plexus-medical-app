/**
 * @file ai.ts
 * @description This file is responsible for initializing and exporting the Google GenAI client instance for server-side use.
 * It ensures the API key is loaded securely from environment variables.
 */
import { GoogleGenAI } from "@google/genai";

// CRITICAL: The API key is sourced EXCLUSIVELY from the environment variable `process.env.API_KEY` on the server.
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });