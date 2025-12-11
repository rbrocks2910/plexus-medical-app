import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GenerateContentResponse } from "@google/genai";
import { ai } from './_lib/ai.js';
import { getInvestigationPrompt } from './_lib/prompts.js';
import { investigationReportSchema } from './_lib/schemas.js';
import { InvestigationResult, MedicalCase } from './_lib/types.js';
import { getInvestigationType } from './_lib/constants.js';
import { verifyAuth, AuthResult } from './_lib/auth.js';
import { rateLimit } from './_lib/rateLimit.js';
import { FirebaseAdminService } from './_lib/firebaseAdminService.js';
import {
  validateTextField,
  ValidationResult
} from './_lib/validation.js';

interface ReportData {
    result: string;
    interpretation: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests allowed' });
    }

    // Apply rate limiting - limit to 20 requests per 5 minutes per authenticated user for investigation results
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
        typeof body.testName !== 'string' ||
        !body.medicalCase || typeof body.medicalCase !== 'object' ||
        !body.medicalCase.patient || typeof body.medicalCase.patient !== 'object' ||
        typeof body.medicalCase.underlyingDiagnosis !== 'string'
    ) {
        return res.status(400).json({ error: 'Invalid request body. "testName" (string) and a valid "medicalCase" (object) are required.' });
    }

    // Detailed validation of input parameters
    const testNameValidation = validateTextField(body.testName, 200);
    const underlyingDiagnosisValidation = validateTextField(body.medicalCase.underlyingDiagnosis, 500);

    // Combine validation results
    const validationErrors: string[] = [];

    if (!testNameValidation.isValid) {
      validationErrors.push(...testNameValidation.errors);
    }

    if (!underlyingDiagnosisValidation.isValid) {
      validationErrors.push(...underlyingDiagnosisValidation.errors);
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
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

        // Update API usage statistics after successful processing
        try {
          await FirebaseAdminService.incrementApiUsage(authResult.userId);
        } catch (usageError) {
          console.error('Error updating API usage stats:', usageError);
          // Don't fail the request just because we couldn't update usage stats
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