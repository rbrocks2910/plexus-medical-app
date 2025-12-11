import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GenerateContentResponse } from "@google/genai";
import { ai } from './_lib/ai.js';
import { getGuiderPrompt } from './_lib/prompts.js';
import { guiderAdviceSchema } from './_lib/schemas.js';
import { MedicalCase, ChatMessage, InvestigationResult } from './_lib/types.js';
import { verifyAuth, AuthResult } from './_lib/auth.js';
import { rateLimit } from './_lib/rateLimit.js';
import { validateTextField, validateArray, ValidationResult } from './_lib/validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests allowed' });
    }

    // Apply rate limiting - limit to 15 requests per 5 minutes per authenticated user for guider advice
    const rateLimitResult = await rateLimit(req, 5 * 60 * 1000, 15); // 15 requests per 5 minutes
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

    const body = req.body;
    // Robust validation of the request body
    if (
        !body ||
        typeof body !== 'object' ||
        !body.medicalCase || typeof body.medicalCase !== 'object' ||
        !body.medicalCase.patient || typeof body.medicalCase.patient !== 'object' ||
        typeof body.medicalCase.underlyingDiagnosis !== 'string' ||
        !Array.isArray(body.chatHistory) ||
        !Array.isArray(body.investigations) ||
        !Array.isArray(body.differentialDiagnoses)
    ) {
        return res.status(400).json({ error: "Invalid request body. Missing or malformed required fields." });
    }

    // Additional validation of input parameters
    const underlyingDiagnosisValidation = validateTextField(body.medicalCase.underlyingDiagnosis, 500);
    const chatHistoryValidation = validateArray(
      body.chatHistory,
      (message: ChatMessage) => validateTextField(message.text, 2000),
      50
    );
    const investigationsValidation = validateArray(
      body.investigations,
      (investigation: InvestigationResult) => validateTextField(investigation.testName, 200),
      20
    );
    const diffDiagnosesValidation = validateArray(
      body.differentialDiagnoses,
      (item: string) => validateTextField(item, 200),
      20
    );

    // Combine validation results
    const validationErrors: string[] = [];

    if (!underlyingDiagnosisValidation.isValid) {
      validationErrors.push(...underlyingDiagnosisValidation.errors);
    }

    if (!chatHistoryValidation.isValid) {
      validationErrors.push(...chatHistoryValidation.errors);
    }

    if (!investigationsValidation.isValid) {
      validationErrors.push(...investigationsValidation.errors);
    }

    if (!diffDiagnosesValidation.isValid) {
      validationErrors.push(...diffDiagnosesValidation.errors);
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    try {
        const { medicalCase, chatHistory, investigations, differentialDiagnoses } = body as {
            medicalCase: MedicalCase,
            chatHistory: ChatMessage[],
            investigations: InvestigationResult[],
            differentialDiagnoses: string[]
        };

        const prompt = getGuiderPrompt(medicalCase, chatHistory, investigations, differentialDiagnoses);

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: guiderAdviceSchema,
            }
        });

        res.status(200).json(JSON.parse(response.text || '{}'));

    } catch (error) {
        console.error("Error in /api/getGuiderAdvice:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            critique: ["An error occurred while fetching guidance."],
            suggestion: "Error fetching guidance.",
            rationale: `Could not connect to the guidance AI. Server error: ${errorMessage}`
        });
    }
}