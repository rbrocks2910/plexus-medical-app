/**
 * @file FeedbackScreen.tsx
 * @description This component displays a detailed performance review after the user completes a case.
 *
 * Core Responsibilities:
 * 1.  **Data Reception:** It receives the user's submitted diagnosis, confidence level, and the full simulation context (chat history, differential list)
 *     from the `CaseScreen` via `react-router-dom`'s location state.
 * 2.  **Case Data Retrieval:** It uses the `caseId` from the URL to fetch the original case details (including the correct diagnosis) from the `AppContext`.
 * 3.  **AI Feedback Generation:** It calls the `getCaseFeedback` service, sending all the aggregated data to the Gemini API to generate a comprehensive, structured feedback object.
 * 4.  **UI Rendering:** It presents the feedback in a clear, organized layout using `Card` and custom `AccordionItem` components. Key UI elements include:
 *     - A `ProgressRing` to visually represent diagnostic accuracy.
 *     - Detailed sections for what went well, areas for improvement, and clinical explanations.
 *     - An interactive "Key Missed Clues" feature that highlights relevant parts of the chat history in a modal.
 * 5.  **Navigation:** Provides a button to start a new case, completing the simulation loop.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useAuthContext } from '../../context/AuthContext';
import { getCaseFeedback } from '../../services/api';
import { saveCompletedCaseWithDetails } from '../../services/firestoreService';
import { CaseFeedback, MedicalCase, ChatMessage, InvestigationResult } from '../../types';
import { Card } from '../ui/Card';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { FEEDBACK_ANALYSIS_MESSAGES } from '../../constants/loadingMessages';

// A visual component to display a percentage in a circular progress bar.
// Used here to visually and immediately communicate the user's diagnostic accuracy.
const ProgressRing: React.FC<{ percentage: number }> = ({ percentage }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  // The stroke-dashoffset is animated to create the "filling" effect of the ring.
  const offset = circumference - (percentage / 100) * circumference;

  // Dynamically change color based on the score for at-a-glance feedback.
  let colorClass = 'text-green-500'; // Correct
  if (percentage < 75) colorClass = 'text-yellow-500'; // Partially Correct
  if (percentage < 40) colorClass = 'text-plexus-red'; // Incorrect

  return (
    <div className={`relative h-32 w-32 ${colorClass}`}>
      <svg className="transform -rotate-90" width="100%" height="100%" viewBox="0 0 120 120">
        {/* The background circle */}
        <circle className="text-gray-200" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" />
        {/* The foreground (progress) circle */}
        <circle strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-700">{percentage}%</span>
    </div>
  );
};

// A reusable accordion component for organizing feedback sections.
// It uses local state to manage its open/closed state, allowing users to focus on one section at a time.
const AccordionItem: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ title, children, icon }) => {
    const [isOpen, setIsOpen] = useState(true); // Default to open for better initial visibility of all feedback.
    return (
        <Card className="!p-0">
            {/* The button controls the accordion's open/closed state. */}
            <button onClick={() => setIsOpen(!isOpen)} className="flex justify-between items-center w-full p-4 text-left font-semibold text-plexus-blue text-lg">
                <div className="flex items-center space-x-3">{icon}<span>{title}</span></div>
                {/* The chevron icon rotates to indicate the current state. */}
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
            </button>
            {/* The content's visibility is controlled by changing `max-h-screen` (visible) to `max-h-0` (hidden). */}
            <div className={`overflow-hidden transition-all duration-500 ease-plexus-ease ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                <div className="p-4 border-t border-gray-200">{children}</div>
            </div>
        </Card>
    )
}

export const FeedbackScreen: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const { state: routeState } = useLocation(); // Access data passed from the navigate() function.
  const navigate = useNavigate();
  const { getCaseById } = useAppContext();
  const { user } = useAuthContext();

  // State for the AI-generated feedback and the original medical case.
  const [feedback, setFeedback] = useState<CaseFeedback | null>(null);
  const [medicalCase, setMedicalCase] = useState<MedicalCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // State for the "Missed Clues" feature modal.
  const [selectedClue, setSelectedClue] = useState<string | null>(null);

  // Destructure performance data passed from CaseScreen. This is crucial for generating feedback.
  const { userDiagnosis, confidence, chatHistory, differentialDiagnoses, investigations = [] } = routeState || {};

  // Effect hook to fetch feedback when the component mounts.
  useEffect(() => {
    // Validate that all necessary data is present; if not, redirect home to prevent errors.
    if (!caseId || !userDiagnosis || !chatHistory || !differentialDiagnoses) {
      navigate('/'); return;
    }
    const foundCase = getCaseById(caseId);
    if (!foundCase) {
      navigate('/'); return;
    }
    setMedicalCase(foundCase);

    const fetchFeedback = async () => {
      setIsLoading(true);
      // Call the API service with all the context to get the feedback.
      const feedbackData = await getCaseFeedback(foundCase, userDiagnosis, confidence, chatHistory, differentialDiagnoses);
      setFeedback(feedbackData);

      // Save completed case to Firestore if user is authenticated
      if (user) {
        try {
          await saveCompletedCaseWithDetails(
            user.uid,
            caseId,
            foundCase,
            userDiagnosis,
            confidence,
            feedbackData,
            chatHistory,
            investigations,
            differentialDiagnoses
          );
        } catch (error) {
          console.error('Error saving completed case to Firestore:', error);
          // We don't want to block the user experience, so we'll continue even if saving fails
        }
      }

      setIsLoading(false);
    };
    fetchFeedback();
  }, [caseId, userDiagnosis, confidence, chatHistory, differentialDiagnoses, getCaseById, navigate, user]);
  
  // Helper function to get dynamic Tailwind CSS classes based on diagnostic correctness.
  const getCorrectnessColor = (correctness: CaseFeedback['correctness']) => {
    switch (correctness) {
        case 'Correct': return 'bg-green-100 text-green-800';
        case 'Partially Correct': return 'bg-yellow-100 text-yellow-800';
        case 'Incorrect': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Helper function to get dynamic Tailwind CSS classes based on case rarity.
  const getRarityColor = (rarity: MedicalCase['rarity']) => {
    switch (rarity) {
        case 'Very Common': return 'bg-green-100 text-green-800';
        case 'Common': return 'bg-blue-100 text-blue-800';
        case 'Uncommon': return 'bg-yellow-100 text-yellow-800';
        case 'Rare': return 'bg-orange-100 text-orange-800';
        case 'Very Rare': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading || !medicalCase) {
    return <LoadingOverlay title="Analyzing Performance" messages={FEEDBACK_ANALYSIS_MESSAGES} />;
  }
  
  if (!feedback) {
     return (
      <div className="min-h-screen bg-plexus-bg-secondary flex flex-col items-center justify-center p-4">
        <p className="text-plexus-red">Could not load feedback.</p>
         <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-plexus-blue text-white font-bold rounded-lg hover:bg-plexus-blue-dark">Return Home</button>
      </div>
    );
  }
  
  // Calculate accuracy percentage for the ProgressRing based on the 'correctness' field from the feedback object.
  const accuracyPercentage = feedback.correctness === 'Correct' ? 100 : feedback.correctness === 'Partially Correct' ? 50 : 0;

  return (
    <div className="min-h-screen bg-plexus-bg-secondary p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-plexus-blue">Case Review</h1>
          <p className="text-lg text-gray-600 mt-2">Patient: {medicalCase.patient.name}</p>
          {/* Display case metadata like specialty and rarity for context. */}
          <div className="mt-3 flex justify-center items-center gap-3 flex-wrap">
            <span className="inline-block bg-plexus-accent/10 text-plexus-accent font-semibold px-4 py-1 rounded-full text-sm">Specialty: {medicalCase.specialty}</span>
             <span className={`inline-block font-semibold px-4 py-1 rounded-full text-sm ${getRarityColor(medicalCase.rarity)}`}>Rarity: {medicalCase.rarity}</span>
          </div>
        </header>

        {/* Main feedback content area, using a space-y utility for consistent spacing between accordions. */}
        <div className="space-y-6">
            {/* Accordion for Diagnostic Accuracy */}
            <AccordionItem title="Diagnostic Accuracy" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* The visual progress ring. */}
                    <div className="flex-shrink-0"><ProgressRing percentage={accuracyPercentage} /></div>
                    <div className="flex-grow text-left w-full">
                        {/* A grid comparing the user's diagnosis with the correct one. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-500">Your Diagnosis</p>
                                <p className="text-lg font-bold text-gray-800">{userDiagnosis}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-500">Correct Diagnosis</p>
                                <p className="text-lg font-bold text-plexus-blue">{medicalCase.underlyingDiagnosis}</p>
                            </div>
                        </div>
                        {/* The AI's analysis of the user's reasoning, with a background color indicating correctness. */}
                        <div className={`mt-4 p-3 rounded-lg font-medium ${getCorrectnessColor(feedback.correctness)}`}>
                            {feedback.reasoningAnalysis}
                        </div>
                    </div>
                </div>
            </AccordionItem>
            
            {/* Accordion for Performance Analysis (What Went Well / Improvement Areas) */}
            <AccordionItem title="Performance Analysis" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>}>
                 <div className="space-y-6">
                    {/* List of positive feedback points. */}
                    <div>
                        <h3 className="font-semibold text-green-700">What Went Well</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2 pl-2">
                            {feedback.whatWentWell.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </div>
                    {/* List of constructive feedback points. */}
                    <div>
                        <h3 className="font-semibold text-yellow-700">Areas for Improvement</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2 pl-2">
                            {feedback.areasForImprovement.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </div>
                    {/* A key educational feature: a list of specific clues the user may have missed. */}
                    {feedback.keyMissedClues.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-plexus-red">Key Missed Clues</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2 pl-2">
                            {/* Each clue is a button that opens a modal showing the relevant chat context. */}
                            {feedback.keyMissedClues.map((item, i) => <li key={i}><button onClick={() => setSelectedClue(item)} className="text-plexus-accent underline hover:text-plexus-blue text-left">{item}</button></li>)}
                        </ul>
                    </div>
                    )}
                 </div>
            </AccordionItem>

            {/* Accordion for Differential Diagnosis Review */}
            <AccordionItem title="Differential Diagnosis Review" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
                <div>
                    <h3 className="font-semibold text-gray-700">Your Submitted List</h3>
                    {differentialDiagnoses && differentialDiagnoses.length > 0 ? (
                        <ul className="list-disc list-inside bg-gray-50 p-3 rounded-md mt-2">
                            {differentialDiagnoses.map((d: string, i: number) => <li key={i} className="text-gray-600">{d}</li>)}
                        </ul>
                    ) : (
                        <p className="text-gray-500 italic mt-2">You did not submit a differential diagnosis list.</p>
                    )}
                    {/* The AI's analysis of the quality and relevance of the user's DDx list. */}
                    <h3 className="font-semibold text-gray-700 mt-4">AI Analysis</h3>
                    <div className="text-gray-700 mt-2 prose prose-sm max-w-none">
                      <ul className="list-disc list-inside space-y-1">
                        {feedback.differentialDiagnosisAnalysis.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                </div>
            </AccordionItem>

            {/* Accordion for the detailed clinical explanation of the final diagnosis. */}
            <AccordionItem title="Clinical Explanation" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{feedback.finalDiagnosisExplanation}</p>
            </AccordionItem>
        </div>

        {/* The final call-to-action to complete the learning loop. */}
        <div className="text-center mt-8 space-y-4">
            <button onClick={() => navigate('/')} className="px-8 py-3 bg-plexus-blue text-white font-bold rounded-lg hover:bg-plexus-blue-dark transition-colors ease-plexus-ease transform hover:scale-105">Start New Case</button>
            <div className="mt-4">
                <button onClick={() => navigate('/past-cases')} className="text-plexus-blue hover:text-plexus-blue-dark font-medium underline">View Past Diagnoses</button>
            </div>
        </div>
      </div>
      
      {/* Modal for the "Key Missed Clues" feature. It's shown when `selectedClue` is not null. */}
      {selectedClue && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setSelectedClue(null)}>
              <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl font-bold text-plexus-blue mb-4">Context for Missed Clue</h2>
                  <p className="text-plexus-red bg-red-50 p-3 rounded-md mb-4 font-semibold">{selectedClue}</p>
                  <div className="flex-grow overflow-y-auto pr-2 bg-gray-50 p-4 rounded-md border">
                     {/* It maps over the chat history and highlights messages that are likely related to the selected clue. */}
                     {/* This provides powerful, direct feedback by showing the user exactly where the information was available. */}
                     {chatHistory.map((msg: ChatMessage, index: number) => {
                         const isClueRelated = msg.text.toLowerCase().includes(selectedClue.split(' ')[0].toLowerCase());
                         return (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} my-2`}>
                              <div className={`max-w-md p-3 rounded-xl transition-all ${msg.sender === 'user' ? 'bg-plexus-accent/20' : 'bg-gray-200'} ${isClueRelated ? 'ring-2 ring-plexus-red shadow-lg scale-105' : ''}`}>
                                <p>{msg.text}</p>
                              </div>
                            </div>
                         )
                     })}
                  </div>
                   <button onClick={() => setSelectedClue(null)} className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 self-end">Close</button>
              </Card>
          </div>
      )}
    </div>
  );
};