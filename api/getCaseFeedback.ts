import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GenerateContentResponse } from "@google/genai";
import { ai } from './_lib/ai.js';
import { getFeedbackPrompt } from './_lib/prompts.js';
import { caseFeedbackSchema } from './_lib/schemas.js';
import { MedicalCase, ChatMessage } from './_lib/types.js';
import { verifyAuth, AuthResult } from './_lib/auth.js';
import { rateLimit } from './_lib/rateLimit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests allowed' });
    }

    // Apply rate limiting - limit to 20 requests per 5 minutes per authenticated user for feedback generation
    const rateLimitResult = await rateLimit(req, 5 * 60 * 1000, 20); // 20 requests per 5 minutes
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
        typeof body.userDiagnosis !== 'string' ||
        typeof body.userConfidence !== 'number' ||
        !Array.isArray(body.chatHistory) ||
        !Array.isArray(body.differentialDiagnoses)
    ) {
        return res.status(400).json({ error: "Invalid request body. Missing or malformed required fields." });
    }

    const { medicalCase, userDiagnosis, userConfidence, chatHistory, differentialDiagnoses } = body as {
        medicalCase: MedicalCase,
        userDiagnosis: string,
        userConfidence: number,
        chatHistory: ChatMessage[],
        differentialDiagnoses: string[]
    };

    try {
        const prompt = getFeedbackPrompt(medicalCase, userDiagnosis, userConfidence, chatHistory, differentialDiagnoses);

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: caseFeedbackSchema,
            }
        });

        res.status(200).json(JSON.parse(response.text || '{}'));

    } catch (error) {
        console.error("Error in /api/getCaseFeedback:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            correctness: 'Partially Correct',
            reasoningAnalysis: `An error occurred while generating feedback: ${errorMessage}`,
            whatWentWell: [],
            areasForImprovement: ['Check application logs for Gemini API errors.'],
            keyMissedClues: [],
            differentialDiagnosisAnalysis: ['Could not analyze differential diagnosis list due to a server error.'],
            finalDiagnosisExplanation: `The correct diagnosis was ${medicalCase?.underlyingDiagnosis || 'unknown'}.`
        });
    }
}