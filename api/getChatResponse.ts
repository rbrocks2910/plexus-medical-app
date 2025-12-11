import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GenerateContentResponse } from "@google/genai";
import { ai } from './_lib/ai.js';
import { getChatPrompt } from './_lib/prompts.js';
import { ChatMessage, PatientProfile } from './_lib/types.js';
import { verifyAuth, AuthResult } from './_lib/auth.js';
import { rateLimit } from './_lib/rateLimit.js';

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

        res.status(200).json(result);

    } catch (error) {
        console.error("Error in /api/getChatResponse:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ text: `Server error: ${errorMessage}`, emotionalState: "Confused" });
    }
}