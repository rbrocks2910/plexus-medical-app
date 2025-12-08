import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GenerateContentResponse } from "@google/genai";
import { ai } from './_lib/ai.js';
import { getInvestigationPrompt } from './_lib/prompts.js';
import { investigationReportSchema } from './_lib/schemas.js';
import { InvestigationResult, MedicalCase } from './_lib/types.js';
import { getInvestigationType } from './_lib/constants.js';

interface ReportData {
    result: string;
    interpretation: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests allowed' });
    }

    const body = req.body;
    // Robust validation of the request body
    if (
        !body ||
        typeof body !== 'object' ||
        typeof body.testName !== 'string' ||
        !body.medicalCase || typeof body.medicalCase !== 'object' ||
        !body.medicalCase.patient || typeof body.medicalCase.patient !== 'object' ||
        typeof body.medicalCase.underlyingDiagnosis !== 'string'
    ) {
        return res.status(400).json({ error: 'Invalid request body. "testName" (string) and a valid "medicalCase" (object) are required.' });
    }
    
    const { testName, medicalCase } = body as { testName: string, medicalCase: MedicalCase };

    try {
        const type = getInvestigationType(testName);
        const reportPrompt = getInvestigationPrompt(testName, medicalCase);

        const reportResponse: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: reportPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: investigationReportSchema,
            }
        });
        
        // Explicitly type the parsed JSON to ensure type safety
        const reportData = JSON.parse(reportResponse.text || '{}') as ReportData;

        let finalResult: InvestigationResult = {
            testName,
            result: reportData.result,
            interpretation: reportData.interpretation,
        };

        if (type === 'imaging') {
            // NOTE: Image generation functionality removed due to lack of supported API in Google GenAI SDK
            // The original implementation attempted to use a non-existent generateImages method
            // In a production environment, you could integrate with other image generation services
            // like DALL-E, Stable Diffusion, or Google's Image AI Studio if needed
        }
        
        res.status(200).json(finalResult);

    } catch (error) {
        console.error(`Error in /api/getInvestigationResult for "${testName}":`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            testName: testName,
            result: 'Error generating report',
            interpretation: `There was an unexpected server error: ${errorMessage}`,
        });
    }
}