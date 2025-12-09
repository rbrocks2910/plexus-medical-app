import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GenerateContentResponse } from "@google/genai";
import { ai } from './_lib/ai.js';
import { getGuiderPrompt } from './_lib/prompts.js';
import { guiderAdviceSchema } from './_lib/schemas.js';
import { MedicalCase, ChatMessage, InvestigationResult } from './_lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests allowed' });
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

    try {
        const { medicalCase, chatHistory, investigations, differentialDiagnoses } = body as {
            medicalCase: MedicalCase,
            chatHistory: ChatMessage[],
            investigations: InvestigationResult[],
            differentialDiagnoses: string[]
        };

        const prompt = getGuiderPrompt(medicalCase, chatHistory, investigations, differentialDiagnoses);

        const model = ai.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: guiderAdviceSchema,
            }
        });
        const response: GenerateContentResponse = await model.generateContent(prompt);

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