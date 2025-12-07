/**
 * @file prompts.ts
 * @description This file contains all the prompt engineering logic for interacting with the Gemini API.
 * The functions in this file construct detailed, context-rich prompts that guide the AI's behavior
 * for different tasks, such as generating cases, roleplaying as a patient, providing investigation results, and giving feedback.
 * Effective prompt engineering is the core of Plexus's intelligence and realism.
 */

import { Specialty, PatientProfile, ChatMessage, MedicalCase, InvestigationResult } from './types.js';

/**
 * Generates the prompt for creating a new patient case.
 * This is a highly constrained prompt. We pre-determine the diagnosis and rarity and ask the AI
 * to creatively build a patient profile and story *around* these fixed parameters. This ensures
 * educational accuracy and allows us to control the case distribution.
 *
 * @param specialty - The medical specialty to frame the case in.
 * @param disease - The pre-determined disease name and rarity.
 * @returns A string prompt for the Gemini API.
 */
export const getCaseGenerationPrompt = (specialty: Specialty, disease: { name: string; rarity: string }): string => {
    return `
You are a world-leading expert in medical education and simulation design. Your task is to generate a single, high-quality, unbiased medical case based on a PRE-DETERMINED diagnosis. Your output MUST be a single JSON object that conforms to the provided schema.

---

## Pre-Determined Case Parameters (ABSOLUTE REQUIREMENTS)

*   **Underlying Diagnosis:** You MUST use the following diagnosis: **"${disease.name}"**
*   **Case Rarity:** You MUST classify this case with the following rarity: **"${disease.rarity}"**
*   **Medical Specialty Context:** The case should be relevant to the **'${specialty}'** specialty.

---

## Case Generation Protocol

### Phase 1: Presentation Variation Generator
PRESENTATION DIVERSIFICATION PROTOCOL:
For the given disease, you must randomly choose ONE of these presentation modifiers to create diagnostic complexity:
A. CLASSIC_PRESENTATION, B. ATYPICAL_PRESENTATION, C. EARLY_STAGE, D. ADVANCED_STAGE, E. MASKED_PRESENTATION (obscured by comorbidities), F. PEDIATRIC_VARIANT, G. GERIATRIC_VARIANT.

### Phase 2: Clinical Patient Profile Creation Protocol
CLINICALLY-FOCUSED PATIENT CREATION PROTOCOL:
Create a realistic and clinically-focused patient profile that naturally leads to your selected disease presentation.
- Demographics: Generate an authentic, non-generic Indian name, and an age/gender appropriate for the disease and presentation modifier. Choose an occupation/lifestyle that could plausibly relate to the disease pathology.
- Clinical Background: Build a believable and clinically relevant background. Include pertinent past medical history, family history, and social history (e.g., smoking, alcohol use) that contains subtle but important clues for a medical trainee.
- Symptom Presentation: Craft the 'presentingComplaint' (chiefComplaint, historyOfPresentingIllness) in the patient's natural language. The emotional state should be simple and directly related to their physical symptoms (e.g., 'worried about pain').

### Phase 3: Final Output Generation
FINAL VALIDATION PROTOCOL:
Before finalizing the JSON, internally confirm:
- The 'underlyingDiagnosis' field in your JSON is EXACTLY "${disease.name}".
- The 'rarity' field in your JSON is EXACTLY "${disease.rarity}".
- The patient profile is clinically coherent and contains relevant clues.
- The generated case is a plausible scenario for the given disease.

Produce a single, valid JSON object according to the schema. Do not add any explanatory text outside of the JSON. Your output must begin with '{' and end with '}'.
    `;
};

/**
 * Generates the prompt for the AI to roleplay as the patient during the chat simulation.
 * It provides the AI with its "secret" identity (including the diagnosis), the full conversation history,
 * and strict rules on how to behave to ensure a realistic and helpful interaction.
 *
 * @param chatHistory - The entire conversation up to this point.
 * @param patient - The patient's profile, containing background clues.
 * @param diagnosis - The secret diagnosis the AI must adhere to.
 * @returns A string prompt for the chat response.
 */
export const getChatPrompt = (chatHistory: ChatMessage[], patient: PatientProfile, diagnosis: string): string => {
    const historyStr = chatHistory.map(m => `${m.sender}: ${m.text}`).join('\n');
    return `You are an AI roleplaying as a patient in a medical simulation. Your goal is to provide a clear and accurate medical history.

**Your Identity (Secret):**
- Name: ${patient.name}
- Age/Gender: ${patient.age}, ${patient.gender}
- Secret Diagnosis: ${diagnosis} (DO NOT reveal this. Your symptoms and story are consistent with it.)

**Your Role as Patient:**
- **Your Clinical Background**: ${patient.background}
- **Your Communication Style**: You are a straightforward person focused on your symptoms. You answer questions directly and factually.

**The Conversation So Far:**
${historyStr}

**Your Task: Provide Clear Information.**
1.  **Be a Good Historian**: Respond to the doctor's questions with clear, factual information about your symptoms and medical history.
2.  **Reveal Organically**: Your background contains clinical clues. Reveal a detail only if asked or if it feels natural in the context of a medical interview. You might not know a detail is medically important.
3.  **Simple Emotion**: Your emotional state is simple and directly related to your physical condition.
4.  **Format**: Start your entire reply with your current emotional state in brackets, like [Worried] or [Frustrated]. Then, write your response as the patient.`;
};

/**
 * Generates the prompt for creating a clinical investigation report.
 * The prompt's most critical instruction is to remain objective and NEVER reveal the final diagnosis.
 * It must present findings that are *consistent* with the diagnosis, forcing the user to make the interpretation.
 * It also includes strict formatting rules for different test types to ensure the output can be parsed and displayed correctly.
 *
 * @param testName - The name of the test being requested.
 * @param medicalCase - The full medical case data.
 * @returns A string prompt for generating the report.
 */
export const getInvestigationPrompt = (testName: string, medicalCase: MedicalCase): string => {
    return `You are a neutral clinical reporting tool. A patient, ${medicalCase.patient.name}, with an underlying diagnosis of "${medicalCase.underlyingDiagnosis}", has had the following investigation performed: "${testName}".

    **CRITICAL RULE: DO NOT, under any circumstances, mention, hint at, or reveal the final diagnosis of "${medicalCase.underlyingDiagnosis}" in your report.** Your role is to present objective findings consistent with the diagnosis, not to state the diagnosis itself. The user must make the final interpretation.

    Your task is to generate a realistic and detailed report. You MUST follow the formatting rules below precisely.

    **FORMATTING RULES:**
    1.  The 'result' field must be a concise, one-sentence summary of the key findings only.
    2.  The 'interpretation' field must be a full, formal report.
        - **For Lab Tests (e.g., CBC, BMP):** You MUST format the report as a clean, markdown-style table. Use monospaced backticks for values to ensure alignment. Provide a concluding 'Pathologist's Comment' that describes the findings objectively without naming a disease.
          Example for CBC:
          \`\`\`
Complete Blood Count (CBC)
--------------------------------------
| Test         | Result   | Reference Range | Unit      |
|--------------|----------|-----------------|-----------|
| WBC          | \`15.2\`     | 4.5-11.0        | x10^9/L   |
| RBC          | \`4.8\`      | 4.7-6.1         | x10^12/L  |
| Hemoglobin   | \`14.0\`     | 14-18           | g/dL      |
| Hematocrit   | \`42.0\`     | 42-52           | %         |
| MCV          | \`87\`       | 80-100          | fL        |
| Platelets    | \`250\`      | 150-450         | x10^9/L   |
|--------------|----------|-----------------|-----------|
| Differential |          |                 |           |
| Neutrophils  | \`85\`       | 40-60           | %         |
| Lymphocytes  | \`10\`       | 20-40           | %         |
--------------------------------------
Pathologist's Comment: Marked neutrophilic leukocytosis with a left shift is present. These findings are suggestive of an acute bacterial infection or a significant inflammatory response.
          \`\`\`
        - **For Imaging Tests (e.g., X-Ray, CT):** Provide a structured report with sections for 'Technique', 'Findings', and 'Impression'. The 'Impression' should list the key objective findings (e.g., "1. Right upper lobe consolidation.") but NOT the final overarching diagnosis.
        - **For Physical Exams (e.g., Cardiac Auscultation):** Describe the findings in objective clinical terms (e.g., "S1 and S2 are regular. A grade 3/6 holosystolic murmur is best heard at the apex...").
    `;
};

/**
 * Generates the prompt for the final performance feedback.
 * It aggregates all relevant information from the simulation—the correct diagnosis, the user's diagnosis and confidence,
 * their differential list, and the entire conversation history—to give the AI a complete picture of the user's performance.
 * This allows the AI to provide a highly contextual and personalized analysis.
 *
 * @param medicalCase - The original case data.
 * @param userDiagnosis - The diagnosis submitted by the user.
 * @param userConfidence - The confidence level submitted by the user.
 * @param chatHistory - The full chat log.
 * @param differentialDiagnoses - The user's submitted list of differential diagnoses.
 * @returns A string prompt for generating feedback.
 */
export const getFeedbackPrompt = (medicalCase: MedicalCase, userDiagnosis: string, userConfidence: number, chatHistory: ChatMessage[], differentialDiagnoses: string[]): string => {
    const historySummary = chatHistory.map(m => `${m.sender}: ${m.text}`).join('\n');
    return `A medical student just completed a simulated case.
    
    Case Details:
    - Patient: ${medicalCase.patient.name}, ${medicalCase.patient.age}
    - Patient's Clinical Background: ${medicalCase.patient.background}
    - Presenting Complaint: ${medicalCase.presentingComplaint.chiefComplaint}
    - Correct Diagnosis: ${medicalCase.underlyingDiagnosis}
    - Case Rarity: ${medicalCase.rarity}
    
    Student's Performance:
    - Final Diagnosis Submitted: "${userDiagnosis}"
    - Stated Confidence Level: ${userConfidence}%
    - Differential Diagnosis List Submitted: [${differentialDiagnoses.map(d => `"${d}"`).join(', ')}]
    - Conversation History:
    ${historySummary}
    
    Please provide structured, technically-focused feedback for the student.
    - Analyze their diagnostic accuracy and clinical reasoning.
    - Evaluate their questioning technique for gathering a competent medical history.
    - Pinpoint specific key *clinical* clues the student missed from the patient's history, or investigations.
    - Analyze the submitted Differential Diagnosis list. Was it clinically relevant? Was the correct diagnosis included? Were there any critical 'can't-miss' diagnoses omitted? Provide this analysis in the 'differentialDiagnosisAnalysis' field.`;
};

/**
 * Generates the prompt for the AI Guider feature.
 * The AI is instructed to act as a senior physician, providing mentorship. It is given all the "secret" case information
 * and a summary of the student's progress so far. The prompt guides the AI to provide a structured response containing
 * a critique, a single actionable suggestion, and the rationale, without revealing the final diagnosis.
 *
 * @param medicalCase - The original case data.
 * @param chatHistory - The current chat log.
 * @param investigations - The list of ordered investigations and their results.
 * @param differentialDiagnoses - The user's current differential diagnosis list.
 * @returns A string prompt for generating guidance.
 */
export const getGuiderPrompt = (medicalCase: MedicalCase, chatHistory: ChatMessage[], investigations: InvestigationResult[], differentialDiagnoses: string[]): string => {
    const historySummary = chatHistory.length > 0
        ? chatHistory.map(m => `${m.sender}: ${m.text}`).join('\n')
        : "No conversation has occurred yet.";
    
    const investigationsSummary = investigations.length > 0
        ? investigations.map(i => `- ${i.testName}: ${i.result}`).join('\n')
        : "No investigations ordered yet.";
        
    const ddxSummary = differentialDiagnoses.length > 0
        ? `[${differentialDiagnoses.map(d => `"${d}"`).join(', ')}]`
        : "Empty";

    return `You are an AI roleplaying as a senior attending physician. You are mentoring a medical student who has just asked for your guidance. Your goal is to provide concise, actionable, and educational advice based on their progress. You have full knowledge of the case, including the secret underlying diagnosis.

**Secret Case Information (For Your Eyes Only):**
- Patient Name: ${medicalCase.patient.name}
- Secret Diagnosis: "${medicalCase.underlyingDiagnosis}"
- Patient Background Clues: ${medicalCase.patient.background}
- Presenting Complaint: ${medicalCase.presentingComplaint.chiefComplaint}
- History of Presenting Illness: ${medicalCase.presentingComplaint.historyOfPresentingIllness}

**Student's Progress So Far:**
- Conversation History:
${historySummary}
- Investigations Ordered & Results:
${investigationsSummary}
- Student's Current Differential Diagnosis List: ${ddxSummary}

**Your Task:**
The student has asked for your help. Analyze their performance and provide a structured response as a single, valid JSON object.

1.  **Critique:** First, critically analyze the student's actions. Have they missed key questions related to the patient's background or history? Have they ordered tests prematurely or missed a crucial physical exam? Provide 1-3 specific, constructive criticisms in the 'critique' array. Focus on points of high medical and clinical importance. If their performance has been excellent so far, you can provide positive reinforcement instead, starting the string with "Well done:" (e.g., "Well done: Your line of questioning has been very logical.").
2.  **Suggestion:** Based on your critique, determine the SINGLE MOST IMPORTANT and LOGICAL next step the student should take. This should guide them towards the correct diagnosis without giving it away.
3.  **Rationale:** Explain *why* your suggestion is the correct next step, what it will help clarify, or what it might reveal.

**CRITICAL RULES:**
- **DO NOT** reveal the final diagnosis of "${medicalCase.underlyingDiagnosis}". Guide, don't spoil.
- Be concise and professional.
- Your suggestion must be the *next logical step*. If they haven't done basic bloodwork, suggest that before an advanced MRI. If they haven't asked about key symptoms, suggest that before ordering tests.
- Produce ONLY the JSON object conforming to the schema.
    `;
};