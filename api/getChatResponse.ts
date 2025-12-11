import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GenerateContentResponse } from "@google/genai";
import { ai } from './_lib/ai.js';
import { getChatPrompt } from './_lib/prompts.js';
import { ChatMessage, PatientProfile } from './_lib/types.js';
import { verifyAuth, AuthResult } from './_lib/auth.js';
import { rateLimit } from './_lib/rateLimit.js';
import { FirebaseAdminService } from './_lib/firebaseAdminService.js';
import {
  validateTextField,
  validateArray,
  ValidationResult
} from './_lib/validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests allowed' });
    }

    // Apply rate limiting - limit to 30 requests per 5 minutes per authenticated user for chat responses
    const rateLimitResult = await rateLimit(req, 5 * 60 * 1000, 30); // 30 requests per 5 minutes
    if (!rateLimitResult.allowed) {
        const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfterSeconds.toString());
        return res.status(429).json({
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`
        });
    }

    // Verify authentication
    const authResult: AuthResult = await verifyAuth(req);
    if (!authResult.authenticated) {
        return res.status(401).json({
            error: 'Unauthorized: Invalid or missing authentication token'
        });
    }

    try {
        const body = req.body;
        if (typeof body !== 'object' || body === null || !Array.isArray(body.chatHistory) || !body.patient || typeof body.diagnosis !== 'string') {
            return res.status(400).json({ error: 'Invalid request body. "chatHistory", "patient", and "diagnosis" are required.' });
        }

        // Detailed validation of input parameters
        const diagnosisValidation = validateTextField(body.diagnosis, 500);
        const chatHistoryValidation = validateArray(
          body.chatHistory,
          (message: ChatMessage) => validateTextField(message.text, 2000),
          50
        );

        // Validate patient profile fields
        const patientNameValidation = body.patient.name ? validateTextField(body.patient.name, 100) : { isValid: true, errors: [] } as ValidationResult;
        const patientAgeValidation = body.patient.age ? validateTextField(body.patient.age.toString(), 3) : { isValid: true, errors: [] } as ValidationResult;

        // Combine validation results
        const validationErrors: string[] = [];

        if (!diagnosisValidation.isValid) {
          validationErrors.push(...diagnosisValidation.errors);
        }

        if (!chatHistoryValidation.isValid) {
          validationErrors.push(...chatHistoryValidation.errors);
        }

        if (!patientNameValidation.isValid) {
          validationErrors.push(...patientNameValidation.errors);
        }

        if (!patientAgeValidation.isValid) {
          validationErrors.push(...patientAgeValidation.errors);
        }

        if (validationErrors.length > 0) {
          return res.status(400).json({
            error: 'Validation failed',
            details: validationErrors
          });
        }

        const { chatHistory, patient, diagnosis } = body as { chatHistory: ChatMessage[], patient: PatientProfile, diagnosis: string };

        const prompt = getChatPrompt(chatHistory, patient, diagnosis);

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const rawText = response.text || '';
        const match = rawText.match(/^\[(.*?)\]\s*(.*)/s);

        let result: { text: string; emotionalState: string };
        if (match) {
            result = { emotionalState: match[1], text: match[2].trim() };
        } else {
            result = { text: rawText.trim(), emotionalState: patient.initialEmotionalState };
        }

        // Update API usage statistics after successful processing, but do it carefully to not affect the response
        if (authResult.uid) {
            try {
                await FirebaseAdminService.incrementApiUsage(authResult.uid);
            } catch (usageError) {
                console.error('Error updating API usage stats (non-fatal):', usageError);
                // Important: Don't let usage tracking errors affect the main API response
            }
        }

        res.status(200).json(result);

    } catch (error) {
        console.error("Error in /api/getChatResponse:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ text: `Server error: ${errorMessage}`, emotionalState: "Confused" });
    }
}