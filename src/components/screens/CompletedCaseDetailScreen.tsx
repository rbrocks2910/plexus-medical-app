import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCompletedCaseById } from '../../services/firestoreService';
import { CompletedCase } from '../../services/firestoreService';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';

// Helper function to get dynamic Tailwind CSS classes based on diagnostic correctness.
const getCorrectnessColor = (correctness: string) => {
  switch (correctness) {
    case 'Correct': return 'bg-green-100 text-green-800';
    case 'Partially Correct': return 'bg-yellow-100 text-yellow-800';
    case 'Incorrect': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to get dynamic Tailwind CSS classes based on case rarity.
const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'Very Common': return 'bg-green-100 text-green-800';
    case 'Common': return 'bg-blue-100 text-blue-800';
    case 'Uncommon': return 'bg-yellow-100 text-yellow-800';
    case 'Rare': return 'bg-orange-100 text-orange-800';
    case 'Very Rare': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const confidenceColor = (confidence: number) => {
  if (confidence >= 80) return 'text-green-600';
  if (confidence >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

// A reusable accordion component for organizing feedback sections.
const AccordionItem: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode, defaultOpen?: boolean }> = ({ title, children, icon, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
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

export const CompletedCaseDetailScreen: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [completedCase, setCompletedCase] = useState<CompletedCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!caseId) {
      navigate('/past-cases');
      return;
    }

    const fetchCase = async () => {
      try {
        setIsLoading(true);
        const caseData = await getCompletedCaseById(user.uid, caseId);
        if (caseData) {
          setCompletedCase(caseData);
        } else {
          setError('Case not found');
        }
      } catch (err) {
        console.error('Error fetching completed case:', err);
        setError('Failed to load case details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCase();
  }, [caseId, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-plexus-bg-secondary flex flex-col items-center justify-center p-4">
        <Spinner size="lg" className="text-plexus-blue" />
        <p className="mt-4 text-lg text-gray-600">Loading case details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-plexus-bg-secondary flex flex-col items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-md text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/past-cases')} 
            className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Back to Past Cases
          </button>
        </div>
      </div>
    );
  }

  if (!completedCase) {
    return (
      <div className="min-h-screen bg-plexus-bg-secondary flex flex-col items-center justify-center p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg max-w-md text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Case details not found.</p>
          <button 
            onClick={() => navigate('/past-cases')} 
            className="mt-3 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Back to Past Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-plexus-bg-secondary p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <header className="mb-8">
          <button
            onClick={() => navigate('/past-cases')}
            className="flex items-center text-plexus-blue hover:text-plexus-blue-dark mb-4 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Past Cases
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-plexus-blue">Case Review</h1>
              <p className="text-lg text-gray-600">Patient: {completedCase.medicalCase.patient.name}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className={`inline-block font-semibold px-4 py-1 rounded-full text-sm ${getRarityColor(completedCase.medicalCase.rarity)}`}>
                {completedCase.medicalCase.rarity}
              </span>
              <span className={`inline-block font-semibold px-4 py-1 rounded-full text-sm bg-plexus-accent/10 text-plexus-accent`}>
                {completedCase.medicalCase.specialty}
              </span>
              <span className={`inline-block font-semibold px-4 py-1 rounded-full text-sm ${getCorrectnessColor(completedCase.correctness)}`}>
                {completedCase.correctness}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <h3 className="text-sm font-medium text-gray-500">Your Confidence</h3>
              <p className={`text-2xl font-bold ${confidenceColor(completedCase.confidence)}`}>
                {completedCase.confidence}%
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <h3 className="text-sm font-medium text-gray-500">Your Diagnosis</h3>
              <p className="text-xl font-semibold text-gray-800 truncate" title={completedCase.userDiagnosis}>
                {completedCase.userDiagnosis}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <h3 className="text-sm font-medium text-gray-500">Correct Diagnosis</h3>
              <p className="text-xl font-semibold text-plexus-blue truncate" title={completedCase.medicalCase.underlyingDiagnosis}>
                {completedCase.medicalCase.underlyingDiagnosis}
              </p>
            </div>
          </div>
        </header>

        {/* Main feedback content area, using a space-y utility for consistent spacing between accordions. */}
        <div className="space-y-6">
            {/* Accordion for Diagnostic Accuracy */}
            <AccordionItem 
              title="Diagnostic Accuracy" 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              } 
              defaultOpen={true}
            >
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">AI Analysis</h4>
                    <p className="text-gray-700">{completedCase.reasoningAnalysis}</p>
                  </div>
                </div>
            </AccordionItem>

            {/* Accordion for Clinical Explanation */}
            <AccordionItem 
              title="Clinical Explanation" 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              } 
              defaultOpen={true}
            >
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{completedCase.finalDiagnosisExplanation}</p>
            </AccordionItem>

            {/* Accordion for Chat History */}
            <AccordionItem 
              title={`Consultation History (${completedCase.chatHistory.length} messages)`} 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              }
            >
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {completedCase.chatHistory.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs md:max-w-md p-3 rounded-xl shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-plexus-user-chat text-plexus-blue-dark rounded-br-none' 
                        : 'bg-ivory text-gray-800 rounded-bl-none'
                    }`}>
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionItem>

            {/* Accordion for Investigations */}
            <AccordionItem 
              title={`Investigations (${completedCase.investigations.length})`} 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.874-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              }
            >
              <div className="space-y-3">
                {completedCase.investigations.length > 0 ? (
                  completedCase.investigations.map((investigation, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800">{investigation.testName}</h4>
                      <p className="text-gray-700 mt-1">{investigation.result}</p>
                      {investigation.interpretation && (
                        <p className="text-sm text-gray-600 mt-2 italic">{investigation.interpretation}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">No investigations were ordered for this case.</p>
                )}
              </div>
            </AccordionItem>

            {/* Accordion for Differential Diagnoses */}
            <AccordionItem 
              title="Differential Diagnoses" 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              }
            >
              {completedCase.differentialDiagnoses.length > 0 ? (
                <ul className="list-disc list-inside bg-gray-50 p-3 rounded-md">
                  {completedCase.differentialDiagnoses.map((d, i) => <li key={i} className="text-gray-600">{d}</li>)}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No differential diagnoses were submitted for this case.</p>
              )}
            </AccordionItem>
        </div>

        {/* Back to Past Cases button */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => navigate('/past-cases')}
            className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Past Cases
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-plexus-blue text-white font-bold rounded-lg hover:bg-plexus-blue-dark transition-colors"
          >
            Start New Case →
          </button>
        </div>
      </div>
    </div>
  );
};