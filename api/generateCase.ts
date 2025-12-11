import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GenerateContentResponse } from "@google/genai";
import { ai } from './_lib/ai.js';
import { loadAllDiseaseDBs } from './_lib/db.js';
import { getCaseGenerationPrompt } from './_lib/prompts.js';
import { medicalCaseSchema } from './_lib/schemas.js';
import { Specialty, RaritySelection } from './_lib/types.js';
import { verifyAuth, AuthResult } from './_lib/auth.js';
import { rateLimit } from './_lib/rateLimit.js';
import { FirebaseAdminService } from './_lib/firebaseAdminService.js';
import { validateSpecialty, validateTextField, ValidationResult } from './_lib/validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests allowed' });
    }

    // Apply rate limiting - limit to 10 requests per 5 minutes per authenticated user for case generation
    const rateLimitResult = await rateLimit(req, 5 * 60 * 1000, 10); // 10 requests per 5 minutes
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
        // Basic validation of the request body structure
        if (
            !body ||
            typeof body !== 'object' ||
            typeof body.specialty !== 'string' ||
            typeof body.rarity !== 'string' ||
            (body.recentDiagnoses && !Array.isArray(body.recentDiagnoses))
        ) {
             return res.status(400).json({ error: 'Invalid request body. "specialty" (string), "rarity" (string), and optional "recentDiagnoses" (array) are required.' });
        }

        // Detailed validation of input parameters
        const specialtyValidation = validateSpecialty(body.specialty);
        const rarityValidation = validateTextField(body.rarity, 50);
        const recentDiagnosesValidation = Array.isArray(body.recentDiagnoses)
          ? { isValid: true, errors: [] } as ValidationResult  // Basic validation, we could add more specific validation
          : { isValid: false, errors: ['recentDiagnoses must be an array'] };

        // Combine validation results
        const validationErrors: string[] = [];

        if (!specialtyValidation.isValid) {
          validationErrors.push(...specialtyValidation.errors);
        }

        if (!rarityValidation.isValid) {
          validationErrors.push(...rarityValidation.errors);
        }

        if (!recentDiagnosesValidation.isValid) {
          validationErrors.push(...recentDiagnosesValidation.errors);
        }

        if (validationErrors.length > 0) {
          return res.status(400).json({
            error: 'Validation failed',
            details: validationErrors
          });
        }
        const { specialty, rarity, recentDiagnoses = [] } = body as { specialty: Specialty, rarity: RaritySelection, recentDiagnoses?: string[] };

        const combinedDB = loadAllDiseaseDBs();

        if (Object.keys(combinedDB).length === 0) {
            return res.status(500).json({ error: "All disease databases are empty or failed to load." });
        }

        let specialtyToUse: string = specialty;
        if (specialty === Specialty['General Medicine'] || !combinedDB.hasOwnProperty(specialty)) {
            const availableSpecialties = Object.keys(combinedDB);
            specialtyToUse = availableSpecialties[Math.floor(Math.random() * availableSpecialties.length)];
        }

        const diseaseList = combinedDB[specialtyToUse as keyof typeof combinedDB] || [];

        if (diseaseList.length === 0) {
            return res.status(500).json({ error: `No diseases found for specialty "${specialtyToUse}".` });
        }

        let eligibleDiseases = diseaseList.filter(d => !recentDiagnoses.includes(d.name));
        if (eligibleDiseases.length === 0) {
            eligibleDiseases = diseaseList;
        }

        let selectedPool: { name: string; rarity: string }[] = [];

        if (rarity === 'Any') {
            const commonPool = eligibleDiseases.filter(d => d.rarity === 'Very Common' || d.rarity === 'Common');
            const uncommonPool = eligibleDiseases.filter(d => d.rarity === 'Uncommon');
            const rarePool = eligibleDiseases.filter(d => d.rarity === 'Rare');
            const veryRarePool = eligibleDiseases.filter(d => d.rarity === 'Very Rare');

            const pools = [
                { pool: commonPool, weight: 0.60 },
                { pool: uncommonPool, weight: 0.30 },
                { pool: rarePool, weight: 0.05 },
                { pool: veryRarePool, weight: 0.05 },
            ];

            const availablePools = pools.filter(p => p.pool.length > 0);

            if (availablePools.length > 0) {
                const totalWeight = availablePools.reduce((sum, p) => sum + p.weight, 0);
                let random = Math.random() * totalWeight;

                for (const p of availablePools) {
                    if (random < p.weight) {
                        selectedPool = p.pool;
                        break;
                    }
                    random -= p.weight;
                }
                if (selectedPool.length === 0) {
                     selectedPool = availablePools[availablePools.length - 1].pool;
                }
            } else {
                selectedPool = eligibleDiseases;
            }
        } else {
            selectedPool = eligibleDiseases.filter(d => d.rarity === rarity);
            if (selectedPool.length === 0) {
                selectedPool = eligibleDiseases;
            }
        }

        if (selectedPool.length === 0) {
            return res.status(500).json({ error: `No eligible diseases found for specialty "${specialtyToUse}" after filtering.` });
        }

        const selectedDisease = selectedPool[Math.floor(Math.random() * selectedPool.length)];

        const prompt = getCaseGenerationPrompt(specialtyToUse as Specialty, selectedDisease);

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: medicalCaseSchema,
                temperature: 1.0,
                seed: Math.floor(Math.random() * 1000000),
            }
        });
        const caseData = JSON.parse(response.text || '{}');

        if (!caseData || typeof caseData !== 'object') {
            throw new Error('Invalid AI response: expected JSON object');
        }

        if (caseData.underlyingDiagnosis !== selectedDisease.name) {
             caseData.underlyingDiagnosis = selectedDisease.name;
             caseData.rarity = selectedDisease.rarity;
        }

        const finalCase = {
            ...caseData,
            id: `gen-${Date.now()}`,
            specialty: specialtyToUse as Specialty,
            status: 'active',
        };

        // Update API usage statistics after successful processing, but do it carefully to not affect the response
        if (authResult.uid) {
            try {
                await FirebaseAdminService.incrementApiUsage(authResult.uid);
            } catch (usageError) {
                console.error('Error updating API usage stats (non-fatal):', usageError);
                // Important: Don't let usage tracking errors affect the main API response
            }
        }

        res.status(200).json(finalCase);

    } catch (error) {
        console.error("Error in /api/generateCase:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: `Failed to generate patient case: ${errorMessage}` });
    }
}