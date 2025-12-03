/**
 * @file dummyData.ts
 * @description This file provides fallback data and logic for generating dummy medical cases.
 * Its primary purpose is to ensure the application can run and be tested even when the Gemini API key
 * is not available or if the API service fails. This is a critical part of the app's robustness,
 * allowing for offline development, UI testing, and providing a seamless demo experience.
 */

import { Specialty, CaseRarity, MedicalCase, RaritySelection } from '../types';

// Predefined pools of patient profiles to add variety to dummy cases.
export const DUMMY_PROFILES_MALE = [
    { name: 'Rohan Joshi', occupation: 'Architect', background: 'Rohan is an architect who works long hours and reports high levels of work-related stress. He has a family history of hypertension on his father\'s side. He drinks alcohol socially on weekends and has a 5-pack-year smoking history, having quit 2 years ago.' },
    { name: 'Vikram Singh', occupation: 'Taxi Driver', background: 'Vikram works 12-hour shifts to support his family. His diet consists mainly of street food, and his sleep is often disturbed. He reports that financial constraints sometimes delay his decision to seek medical care for non-urgent issues.' },
    { name: 'Amit Patel', occupation: 'University Student', background: 'Amit is a 20-year-old engineering student living in a crowded dorm. He has a history of childhood asthma that he states he "outgrew". He has a persistent, non-productive cough which he attributes to city pollution.' }
];
export const DUMMY_PROFILES_FEMALE = [
    { name: 'Meena Verma', occupation: 'Primary School Teacher', background: 'Meena is a teacher who lives in a joint family household. She reports significant fatigue for the past several months but has been minimizing her symptoms, attributing them to her demanding job and home life. She has no significant past medical history.' },
    { name: 'Sunita Gupta', occupation: 'Homemaker', background: 'Sunita is a 65-year-old widow. She reports feeling unusually tired and short of breath on exertion. She has not had a routine medical check-up in over five years. Her medical history includes well-controlled hypertension for which she takes amlodipine.' },
    { name: 'Anjali Reddy', occupation: 'Marketing Executive', background: 'Anjali is a high-achieving marketing executive whose job involves frequent travel. She presents as impatient with her illness and provides a very direct, factual history of her symptoms. She denies any smoking history but drinks 1-2 glasses of wine most evenings to "unwind".' }
];

// A small, representative database of diagnoses for a few key specialties.
const DUMMY_DIAGNOSES = {
    [Specialty.Cardiology]: [
        { diagnosis: 'Stable Angina', rarity: 'Common', complaint: 'Chest Pain', history: 'Experiences sharp pain in the chest, especially after exertion.' },
        { diagnosis: 'Atrial Fibrillation', rarity: 'Common', complaint: 'Palpitations', history: 'Feels like their heart is racing or skipping beats, sometimes feels dizzy.' },
        { diagnosis: 'Hypertensive Emergency', rarity: 'Uncommon', complaint: 'Severe Headache and Dizziness', history: 'Woke up with a pounding headache and feels very unsteady.' }
    ],
    [Specialty.Neurology]: [
        { diagnosis: 'Migraine with Aura', rarity: 'Common', complaint: 'Severe Headache', history: 'Recurring headaches for the past month, often preceded by seeing flashing lights.' },
        { diagnosis: 'Bell\'s Palsy', rarity: 'Uncommon', complaint: 'Facial Drooping', history: 'Woke up this morning and the left side of my face felt weak, I can\'t smile properly.' },
        { diagnosis: 'Carpal Tunnel Syndrome', rarity: 'Common', complaint: 'Hand Numbness', history: 'Has numbness and tingling in the thumb and index finger, especially at night.' }
    ],
    [Specialty.Pulmonology]: [
        { diagnosis: 'Community-Acquired Pneumonia', rarity: 'Common', complaint: 'Shortness of Breath and Cough', history: 'Has had a productive cough and difficulty breathing for three weeks, with a recent fever.' },
        { diagnosis: 'Asthma Exacerbation', rarity: 'Common', complaint: 'Wheezing and difficulty breathing', history: 'Known asthmatic, has been using their inhaler more often but it is not helping.' },
        { diagnosis: 'Pulmonary Embolism', rarity: 'Uncommon', complaint: 'Sudden Sharp Chest Pain', history: 'Experienced a sudden, sharp chest pain and extreme shortness of breath after a long flight.' }
    ],
    [Specialty.Gastroenterology]: [
        { diagnosis: 'Gastroesophageal Reflux Disease (GERD)', rarity: 'Very Common', complaint: 'Abdominal Pain', history: 'Complains of a burning sensation in the stomach and chest, which worsens after meals and when lying down.' },
        { diagnosis: 'Irritable Bowel Syndrome (IBS)', rarity: 'Common', complaint: 'Cramping and Bloating', history: 'Experiences intermittent abdominal cramps, bloating, and alternating constipation and diarrhea for months.' },
        { diagnosis: 'Gallstones (Cholelithiasis)', rarity: 'Common', complaint: 'Severe Right Upper Quadrant Pain', history: 'Reports severe, cramping pain in the upper right abdomen, especially after eating fatty foods.' }
    ]
};

/**
 * Generates a complete, structured dummy `MedicalCase` object.
 * @param specialty - The medical specialty requested by the user.
 * @param rarity - The case rarity requested by the user.
 * @returns A `MedicalCase` object with randomized but plausible dummy data.
 */
export const getDummyCase = (specialty: Specialty, rarity: RaritySelection = 'Any'): MedicalCase => {
    const isMale = Math.random() > 0.5;
    const profilePool = isMale ? DUMMY_PROFILES_MALE : DUMMY_PROFILES_FEMALE;
    const selectedProfile = profilePool[Math.floor(Math.random() * profilePool.length)];

    let chiefComplaint = 'General Weakness';
    let history = 'Patient feels unwell.';
    let underlyingDiagnosis = 'Undetermined';
    let caseRarity: CaseRarity = 'Common';
    
    const availableDummySpecialties = Object.keys(DUMMY_DIAGNOSES);
    let specialtyKey = specialty;
    
    if (specialty === Specialty['General Medicine'] || !(specialty in DUMMY_DIAGNOSES)) {
        specialtyKey = availableDummySpecialties[Math.floor(Math.random() * availableDummySpecialties.length)] as Specialty;
    }

    const allPossibleCases = DUMMY_DIAGNOSES[specialtyKey as keyof typeof DUMMY_DIAGNOSES];
    let possibleCases = allPossibleCases;

    if (rarity !== 'Any') {
        const filteredCases = allPossibleCases.filter(c => c.rarity === rarity);
        if (filteredCases.length > 0) {
            possibleCases = filteredCases;
        } else {
            console.warn(`No dummy cases of rarity "${rarity}" for specialty "${specialtyKey}". Using any rarity.`);
        }
    }

    const selectedCase = possibleCases[Math.floor(Math.random() * possibleCases.length)];

    chiefComplaint = selectedCase.complaint;
    history = selectedCase.history;
    underlyingDiagnosis = selectedCase.diagnosis;
    caseRarity = selectedCase.rarity as CaseRarity;

    return {
        id: `dummy-${Date.now()}`,
        rarity: caseRarity,
        specialty,
        patient: {
            name: selectedProfile.name,
            age: Math.floor(Math.random() * 40) + 25, // Random age between 25 and 65
            gender: isMale ? 'Male' : 'Female',
            occupation: selectedProfile.occupation,
            background: selectedProfile.background,
            initialEmotionalState: ['Anxious', 'Concerned', 'Calm'][Math.floor(Math.random() * 3)] as string,
        },
        presentingComplaint: {
            chiefComplaint,
            historyOfPresentingIllness: history,
        },
        underlyingDiagnosis,
        status: 'active'
    };
};