/**
 * @file loadingMessages.ts
 * @description This file centralizes the arrays of strings used for display on loading screens.
 * The purpose of these messages is to enhance the user experience during waiting periods (e.g., API calls).
 * Instead of a static "Loading..." message, the application can display relevant tips, famous medical quotes,
 * or status updates, making the wait feel shorter and more engaging.
 */

// An array of medical wisdom, quotes, and cognitive bias reminders.
// These are displayed on the `LoadingOverlay` when a new case is being generated.
export const CASE_GENERATION_TIPS = [
    "\"The good physician treats the disease; the great physician treats the patient who has the disease.\" - William Osler",
    "Occam's Razor: The simplest explanation is often the right one. Don't overcomplicate the differential.",
    "Hickam's Dictum: A patient can have as many diseases as they damn well please. Consider co-morbidities.",
    "\"Listen to your patient; he is telling you the diagnosis.\" - William Osler",
    "Always consider the base rates. Common diseases are common.",
    "Build a broad differential diagnosis first, then narrow it down with targeted questions and tests.",
    "Cognitive bias alert: Avoid anchoring on the first piece of information you receive.",
    "Before ordering a test, ask yourself: 'How will this result change my management?'",
    "Don't forget to ask about over-the-counter medications and supplements.",
    "Review the vital signs personally. They tell a story.",
    "\"Observation, reason, human understanding, courage; these make the physician.\" - Martin H. Fischer",
    "Think about the worst-case scenario. What can't you afford to miss?",
    "Revisit the patient's chief complaint often. Are you still addressing it?",
    "\"To study the phenomena of disease without books is to sail an uncharted sea, while to study books without patients is not to go to sea at all.\" - William Osler",
    "Cognitive bias alert: Recency bias makes you favor diagnoses you've seen recently. Stay objective.",
    "A thorough history is more valuable than any single test.",
    "\"Medicine is a science of uncertainty and an art of probability.\" - William Osler",
    "Don't just treat the numbers. Treat the patient.",
    "Could this be a drug side effect? Always review the medication list.",
    "\"We are what we repeatedly do. Excellence, then, is not an act, but a habit.\" - Aristotle",
    "Trust your gut, but verify with evidence.",
    "The patient's story is the most powerful diagnostic tool.",
    "Consider atypical presentations of common diseases.",
    "Always perform a thorough physical examination.",
    "Document your findings clearly and concisely. The next person to see the patient will thank you.",
    "A diagnosis is a starting point, not a final destination.",
    "What are the patient's expectations for this visit?",
    "\"Wherever the art of Medicine is loved, there is also a love of Humanity.\" - Hippocrates",
    "Never be afraid to say 'I don't know' and consult a colleague.",
    "\"The physician must be able to tell the antecedents, know the present, and foretell the future...\" - Hippocrates",
    "Is there a family history of this condition?",
    "Consider the patient's occupation and potential exposures.",
    "Think anatomically. Where is the problem located?",
    "Think pathophysiologically. What is the underlying process?",
    "Don't dismiss a symptom just because it seems minor.",
    "\"The aim of medicine is to prevent disease and prolong life; the ideal of medicine is to eliminate the need of a physician.\" - William J. Mayo",
    "Always establish a clear timeline of the illness.",
    "\"Cure sometimes, treat often, comfort always.\" - Hippocrates (attributed)",
    "Consider the nutritional status of the patient.",
    "Remember that correlation does not equal causation.",
    "First, do no harm (Primum non nocere).",
    "When you hear hoofbeats, think of horses, not zebras... but don't forget zebras exist.",
    "The eye cannot see what the mind does not know.",
    "The greatest medicine of all is teaching people how not to need it.",
    "A good history and physical exam can lead to the right diagnosis 80% of the time.",
    "What is the one test that will most significantly change your post-test probability?",
    "Check for allergies before prescribing any new medication.",
    "Cognitive bias alert: Search satisfying. Don't stop looking for other problems once you've found the first one.",
    "Always reassess your patient. Their condition can change rapidly.",
    "The absence of evidence is not evidence of absence.",
    "\"The physician's highest calling, his only calling, is to make sick people healthy - to heal, as it is termed.\" - Samuel Hahnemann",
    "Is this an acute problem, a chronic problem, or an acute-on-chronic problem?",
    "Formulate a problem list to keep your thoughts organized.",
    "Think about the patient's health literacy when explaining complex concepts.",
    "Don't forget to address pain management early and effectively.",
    "Before discharging, ensure the patient understands their diagnosis, treatment plan, and follow-up instructions."
];

// An array of status updates displayed on the `LoadingOverlay` on the FeedbackScreen.
// These messages inform the user about the steps involved in generating their performance report.
export const FEEDBACK_ANALYSIS_MESSAGES = [
    "Compiling patient data...",
    "Analyzing diagnostic accuracy...",
    "Analyzing clinical questioning...",
    "Correlating chat history with clinical findings...",
    "Reviewing differential diagnosis formulation...",
    "Assessing investigation requests...",
    "Pinpointing missed diagnostic clues...",
    "Generating personalized feedback...",
    "Finalizing clinical performance report...",
];