/**
 * @file CaseScreen.tsx
 * @description This is the core component of the Plexus application, where the user interacts with the medical simulation.
 * It is a complex, stateful component responsible for:
 * 1.  **Patient Consultation:** Managing the chat interface between the user and the AI patient.
 * 2.  **Clinical Investigations:** Allowing the user to order labs, imaging, and exams, and displaying the results.
 * 3.  **Differential Diagnosis:** Providing a tool for the user to list and manage their potential diagnoses.
 * 4.  **AI Guidance:** Offering contextual advice from an AI mentor based on the user's progress.
 * 5.  **Diagnosis Submission:** Handling the final diagnosis proposal and navigating to the feedback screen.
 * It fetches case data using the `caseId` from the URL and extensively uses local state (`useState`) to manage the dynamic UI.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { MedicalCase, ChatMessage, InvestigationResult } from '../../types';
// FIX: Update import to use the new API service from within the src directory.
import { getChatResponse, getInvestigationResult, getGuiderAdvice } from '../../src/services/api';
import { INVESTIGATION_OPTIONS } from '../../constants';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { ReportViewer } from '../reports/ReportViewer';
import { LabIcon, ImagingIcon, ExamIcon } from '../icons/ReportIcons';
import { GuiderIcon } from '../icons/GuiderIcons';

// Type alias for the active tab in the right-hand panel, improving readability.
type ActiveTab = 'reports' | 'order' | 'differential' | 'guider';

// A collection of simple SVG icon components used for UI clarity.
const DocumentIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const PlusCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const PatientIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);
const ClipboardListIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
);

export const CaseScreen: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { getCaseById, completeCase } = useAppContext();
  
  // === LOCAL STATE MANAGEMENT ===
  // This section defines all the state variables that control the dynamic aspects of the CaseScreen.
  // Each piece of state is responsible for a specific part of the UI or simulation logic.
  const [medicalCase, setMedicalCase] = useState<MedicalCase | null>(null); // Holds the full data for the current medical case.
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]); // An array of all messages in the consultation.
  const [investigations, setInvestigations] = useState<InvestigationResult[]>([]); // An array of all requested investigations and their results.
  const [userInput, setUserInput] = useState(''); // The user's current input in the chat box.
  const [isPatientReplying, setIsPatientReplying] = useState(false); // Loading state for when the AI patient is "typing".
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for the final diagnosis submission button.
  const [patientEmotionalState, setPatientEmotionalState] = useState(''); // The patient's current emotional state, updated with each AI response.
  
  // State for the final diagnosis modal.
  const [finalDiagnosis, setFinalDiagnosis] = useState(''); // The diagnosis text entered by the user.
  const [confidence, setConfidence] = useState(50); // The user's confidence level (0-100).
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false); // Controls visibility of the final diagnosis modal.
  
  // State for the right-hand panel UI.
  const [activeTab, setActiveTab] = useState<ActiveTab>('guider'); // Controls which tab is visible in the right panel. Defaults to 'guider'.
  const [selectedReport, setSelectedReport] = useState<InvestigationResult | null>(null); // Holds the data for the report being viewed in the modal.
  const [customTestName, setCustomTestName] = useState(''); // Input for ordering a custom investigation.

  // State for the Differential Diagnosis feature.
  const [differentialDiagnoses, setDifferentialDiagnoses] = useState<string[]>([]); // The list of potential diagnoses.
  const [ddxInput, setDdxInput] = useState(''); // The user's input for adding a new differential diagnosis.

  // State for the AI Guider feature.
  const [guiderAdvice, setGuiderAdvice] = useState<{ critique: string[]; suggestion: string; rationale: string } | null>(null); // The structured advice from the AI mentor.
  const [isGuiderLoading, setIsGuiderLoading] = useState(false); // Loading state for the Guider feature.

  // Ref to automatically scroll the chat window to the latest message.
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Effect to fetch and set up the case data when the component mounts or caseId changes.
  useEffect(() => {
    if (caseId) {
      const foundCase = getCaseById(caseId);
      if (foundCase) {
        setMedicalCase(foundCase);
        setPatientEmotionalState(foundCase.patient.initialEmotionalState);
         // Add the initial greeting from the patient to the chat history only once to start the conversation.
         if (chatHistory.length === 0) {
            setChatHistory([{
                sender: 'patient',
                text: `Hello Doctor, thank you for seeing me. I'm here about my ${foundCase.presentingComplaint.chiefComplaint.toLowerCase()}.`,
                timestamp: new Date().toISOString(),
                emotionalState: foundCase.patient.initialEmotionalState
            }]);
        }
      } else {
        // If the case ID is invalid or not found (e.g., page refresh), redirect to the home screen to prevent errors.
        navigate('/');
      }
    }
  }, [caseId, getCaseById, navigate, chatHistory.length]);

  // Effect to scroll the chat view automatically when new messages are added, ensuring the latest message is always visible.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // === FEATURE: PATIENT CONSULTATION (CHAT) ===
  const handleSendMessage = async () => {
    if (!userInput.trim() || !medicalCase) return;

    const userMessage: ChatMessage = { sender: 'user', text: userInput, timestamp: new Date().toISOString() };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    setUserInput('');
    setIsPatientReplying(true); // Show the "typing" indicator.

    // Call the Gemini service, providing full context for a coherent response.
    const response = await getChatResponse(newHistory, medicalCase.patient, medicalCase.underlyingDiagnosis);
    
    const patientMessage: ChatMessage = {
      sender: 'patient',
      text: response.text,
      timestamp: new Date().toISOString(),
      emotionalState: response.emotionalState, // Extract the emotional state for the UI.
    };

    setPatientEmotionalState(response.emotionalState);
    setChatHistory([...newHistory, patientMessage]);
    setIsPatientReplying(false); // Hide the "typing" indicator.
  };
  
  // === FEATURE: ORDERING INVESTIGATIONS ===
  const handleRequestInvestigation = async (testName: string) => {
    // Prevent ordering empty or duplicate tests.
    if (!medicalCase || !testName.trim() || investigations.some(inv => inv.testName.toLowerCase() === testName.toLowerCase())) return;
    
    setActiveTab('reports'); // Automatically switch to the reports tab for immediate user feedback.
    // Add a placeholder to the UI to show the test is being processed. This provides an immediate response to the user's action.
    setInvestigations(prev => [...prev, { testName, result: 'Processing...' }]);
    // Call the Gemini service to generate the report.
    const result = await getInvestigationResult(testName, medicalCase);
    // Replace the placeholder with the actual result once it's available.
    setInvestigations(prev => prev.map(inv => inv.testName === testName ? result : inv));
  };

  const handleRequestCustomTest = () => {
      handleRequestInvestigation(customTestName);
      setCustomTestName('');
  }

  // === FEATURE: DIFFERENTIAL DIAGNOSIS MANAGEMENT ===
  const handleAddDdx = () => {
    // Add a new diagnosis to the list if it's not empty and not a duplicate (case-insensitive).
    if (ddxInput.trim() && !differentialDiagnoses.map(d => d.toLowerCase()).includes(ddxInput.trim().toLowerCase())) {
        setDifferentialDiagnoses(prev => [...prev, ddxInput.trim()]);
        setDdxInput('');
    }
  };

  const handleRemoveDdx = (diagnosisToRemove: string) => {
      setDifferentialDiagnoses(prev => prev.filter(d => d !== diagnosisToRemove));
  };

  // === FEATURE: AI GUIDER ===
  const handleAskGuider = async () => {
    if (!medicalCase) return;
    setIsGuiderLoading(true);
    setGuiderAdvice(null);
    try {
        // Call the Gemini service, providing the complete current state of the simulation for contextual advice.
        const advice = await getGuiderAdvice(medicalCase, chatHistory, investigations, differentialDiagnoses);
        setGuiderAdvice(advice);
    } catch (error) {
        console.error("Failed to get guider advice:", error);
        // Provide a graceful error message in the UI if the API fails.
        setGuiderAdvice({
            critique: ["There was an issue communicating with the guidance AI."],
            suggestion: "Error fetching advice.",
            rationale: "Please try again in a moment."
        });
    } finally {
        setIsGuiderLoading(false);
    }
  };
  
  // === FEATURE: PROPOSE FINAL DIAGNOSIS ===
  const handleSubmitDiagnosis = () => {
    if (!finalDiagnosis.trim() || !caseId) return;
    setIsSubmitting(true);
    completeCase(caseId); // Update the global state to mark the case as completed.
    // Navigate to the FeedbackScreen, passing all performance data via the router's state object.
    // This is a clean way to transfer temporary session data between routes without polluting global state.
    navigate(`/feedback/${caseId}`, { state: { userDiagnosis: finalDiagnosis, confidence, chatHistory, differentialDiagnoses } });
  };

  // Render a spinner if the case data is still loading.
  if (!medicalCase) {
    return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
  }
  
  // Reusable component for the tab buttons in the right-hand panel. This promotes code reuse and consistent styling.
  const TabButton: React.FC<{tabName: ActiveTab, currentTab: ActiveTab, children: React.ReactNode, icon: React.ReactNode}> = ({tabName, currentTab, children, icon}) => (
    <button
        onClick={() => setActiveTab(tabName)}
        // Dynamic classes change the button's appearance based on whether it's the active tab.
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all duration-300 ease-plexus-ease border-b-2 rounded-t-lg
            ${currentTab === tabName 
                ? 'text-plexus-blue border-plexus-accent' // Style for active tab
                : 'text-gray-500 border-transparent hover:bg-plexus-accent/10 hover:text-plexus-blue' // Style for inactive tabs
            }
        `}
    >
        {icon}
        {children}
    </button>
  );
  
  // Reusable component for categories of investigations in the 'Order' tab.
  const InvestigationCategory: React.FC<{title: string, tests: string[], icon: React.ReactNode}> = ({title, tests, icon}) => (
     <div className="mb-4">
        <h3 className="font-semibold text-gray-600 text-sm my-2 px-2 flex items-center gap-2">{icon} {title}</h3>
        <div className="space-y-1">
            {tests.map(test => (
                <button 
                    key={test} 
                    onClick={() => handleRequestInvestigation(test)} 
                    className="w-full text-left p-2 rounded-md hover:bg-plexus-accent/10 text-sm text-gray-700 disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors duration-200"
                    // Disable the button if the test has already been ordered to prevent duplicates.
                    disabled={investigations.some(i => i.testName.toLowerCase() === test.toLowerCase())}
                >
                    {test}
                </button>
            ))}
        </div>
     </div>
  )

  return (
    // Main layout container. A grid is used for responsive two-column layout on larger screens.
    <div className="min-h-screen bg-plexus-bg-secondary p-4 lg:p-6 pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-screen-2xl mx-auto">
        
        {/* === Left Column: Patient Info and Chat Interface === */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Card displaying patient demographics and chief complaint. */}
          <Card>
            <div className="flex justify-between items-start">
              {/* Patient Name and Details */}
              <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                      <PatientIcon className="h-10 w-10" />
                  </div>
                  <div>
                      <h1 className="text-3xl font-bold text-plexus-blue">{medicalCase.patient.name}</h1>
                      <p className="text-gray-600 text-md">{medicalCase.patient.age}, {medicalCase.patient.gender}</p>
                  </div>
              </div>
              {/* Current emotional state of the patient, a key feature for empathy training. */}
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-semibold text-plexus-accent">Patient State</p>
                <p className="text-gray-700">{patientEmotionalState}</p>
              </div>
            </div>
             <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-700">Chief Complaint</h3>
                <p className="text-gray-600">{medicalCase.presentingComplaint.chiefComplaint}</p>
            </div>
          </Card>

          {/* Card containing the main chat interface. */}
          <Card className="flex flex-col h-[65vh]">
            <h2 className="text-xl font-semibold mb-4 text-plexus-blue">Consultation</h2>
            {/* Chat history display area. `overflow-y-auto` makes it scrollable. */}
            <div className="flex-grow overflow-y-auto pr-4 space-y-4">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'patient' && <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 flex-shrink-0"><PatientIcon className="h-5 w-5"/></div>}
                  {/* Dynamic styling for user vs. patient messages. */}
                  <div className={`max-w-md p-3 rounded-xl shadow-sm ${msg.sender === 'user' ? 'bg-plexus-user-chat text-plexus-blue-dark rounded-br-none' : 'bg-ivory text-gray-800 rounded-bl-none'}`}>
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))}
              {/* The "patient is typing" indicator, shown conditionally. */}
              {isPatientReplying && (
                <div className="flex items-end gap-2 justify-start">
                  <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 flex-shrink-0"><PatientIcon className="h-5 w-5"/></div>
                  <div className="bg-ivory text-gray-800 p-3 rounded-xl rounded-bl-none shadow-sm">
                    <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-pulse" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              {/* An invisible element at the end of the chat, used as a target for auto-scrolling. */}
              <div ref={chatEndRef} />
            </div>
            {/* Chat input area at the bottom of the card. */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2">
              <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ask the patient a question..." className="flex-grow p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-plexus-accent focus:border-plexus-accent transition-colors" disabled={isPatientReplying}/>
              <button onClick={handleSendMessage} disabled={isPatientReplying || !userInput.trim()} className="bg-plexus-blue text-white font-bold py-3 px-5 rounded-lg hover:bg-plexus-blue-dark disabled:bg-gray-400 transition-all duration-300 ease-plexus-ease transform hover:scale-105">Send</button>
            </div>
          </Card>
        </div>

        {/* === Right Column: Tabbed Interface for Investigations, DDx, and Guider === */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-full max-h-[calc(65vh+160px)]">
            {/* Tab navigation bar */}
            <div className="flex border-b border-gray-200 -mx-6 px-2">
                <TabButton tabName="guider" currentTab={activeTab} icon={<GuiderIcon className="h-5 w-5"/>}>Guider</TabButton>
                <TabButton tabName="differential" currentTab={activeTab} icon={<ClipboardListIcon className="h-5 w-5"/>}>Differential</TabButton>
                <TabButton tabName="order" currentTab={activeTab} icon={<PlusCircleIcon className="h-5 w-5"/>}>Order</TabButton>
                <TabButton tabName="reports" currentTab={activeTab} icon={<DocumentIcon className="h-5 w-5"/>}>Reports</TabButton>
            </div>
            {/* Container for the content of the currently active tab. */}
            <div className="mt-4 flex-grow flex flex-col overflow-y-auto pr-2">
                
                {/* Guider Tab Content */}
                {activeTab === 'guider' && (
                  <div className="animate-fade-in flex flex-col h-full">
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                      {isGuiderLoading ? (
                         <div className="flex flex-col items-center text-gray-500 pt-10"><Spinner size="md" className="border-plexus-accent/50" /><p className="mt-3 text-sm italic">Guider is analyzing your progress...</p></div>
                      ) : guiderAdvice ? (
                        <div className="space-y-6">
                           <h3 className="font-semibold text-plexus-accent text-md">Suggestion</h3>
                           <p className="mt-1 p-3 bg-plexus-accent/10 text-plexus-blue-dark rounded-lg font-medium">{guiderAdvice.suggestion}</p>
                           <h3 className="font-semibold text-gray-700 text-md">Rationale</h3>
                           <p className="mt-1 text-gray-600">{guiderAdvice.rationale}</p>
                           {guiderAdvice.critique.length > 0 && (
                            <>
                                <h3 className="font-semibold text-gray-700 text-md">Critique</h3>
                                <ul className="list-disc list-inside space-y-1 text-gray-600 mt-2 pl-2">
                                    {guiderAdvice.critique.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </>
                           )}
                        </div>
                      ) : (
                         <div className="text-center text-gray-500 pt-10"><GuiderIcon className="h-12 w-12 mx-auto text-gray-400"/><h3 className="mt-2 text-lg font-semibold text-gray-700">Need Guidance?</h3><p className="mt-1 text-sm">Click the button below to ask the AI Guider for a contextual tip based on your progress.</p></div>
                      )}
                    </div>
                    <div className="pt-4 mt-auto border-t border-gray-200">
                      <button onClick={handleAskGuider} disabled={isGuiderLoading} className="w-full bg-plexus-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-plexus-accent/90 disabled:bg-gray-400 disabled:cursor-wait transition-all duration-300 ease-plexus-ease flex items-center justify-center gap-2">
                        <GuiderIcon className="h-5 w-5"/>
                        {isGuiderLoading ? 'Thinking...' : (guiderAdvice ? 'Get Updated Advice' : 'Ask Guider for Advice')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Differential Tab Content */}
                {activeTab === 'differential' && (
                  <div className="animate-fade-in flex flex-col h-full">
                    <div className="flex-grow overflow-y-auto pr-2">
                        {differentialDiagnoses.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">Your differential diagnosis list is empty.</p>
                        ) : (
                            <ul className="space-y-2">
                                {differentialDiagnoses.map((d, i) => (
                                    <li key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                                        <span className="text-gray-800">{d}</span>
                                        <button onClick={() => handleRemoveDdx(d)} className="text-red-500 hover:text-red-700 p-1 rounded-full">&times;</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                     <div className="pt-4 mt-auto border-t border-gray-200 flex gap-2">
                        <input type="text" value={ddxInput} onChange={e => setDdxInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddDdx()} placeholder="Add to list..." className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-plexus-accent"/>
                        <button onClick={handleAddDdx} className="bg-plexus-blue text-white font-semibold px-4 py-2 rounded-md hover:bg-plexus-blue-dark">Add</button>
                    </div>
                  </div>
                )}

                {/* Order Tab Content */}
                {activeTab === 'order' && (
                    <div className="animate-fade-in">
                        {/* Categories of tests, using the reusable component. */}
                        <InvestigationCategory title="Common Labs" tests={INVESTIGATION_OPTIONS.labs} icon={<LabIcon className="h-4 w-4 text-blue-500"/>} />
                        <InvestigationCategory title="Common Imaging" tests={INVESTIGATION_OPTIONS.imaging} icon={<ImagingIcon className="h-4 w-4 text-purple-500"/>} />
                        <InvestigationCategory title="Physical Exams" tests={INVESTIGATION_OPTIONS.exams} icon={<ExamIcon className="h-4 w-4 text-green-500"/>} />
                        {/* Input for requesting a custom test not in the predefined lists. */}
                        <div className="pt-4 mt-2 border-t border-gray-200">
                             <h3 className="font-semibold text-gray-600 text-sm mb-2 px-2">Order Custom Test</h3>
                             <div className="flex gap-2">
                                <input type="text" value={customTestName} onChange={e => setCustomTestName(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleRequestCustomTest()} placeholder="e.g., 'Serum Ferritin'" className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-plexus-accent"/>
                                <button onClick={handleRequestCustomTest} className="bg-plexus-blue text-white font-semibold px-4 py-2 rounded-md hover:bg-plexus-blue-dark">Order</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Reports Tab Content */}
                {activeTab === 'reports' && (
                    <div className="space-y-2 animate-fade-in">
                        {investigations.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No investigations ordered yet.</p>}
                        {/* Map over the investigations array to display each one. */}
                        {investigations.map((inv, i) => (
                            <button key={i} onClick={() => inv.result !== 'Processing...' && setSelectedReport(inv)} className="w-full text-left p-3 rounded-lg hover:bg-plexus-accent/10 disabled:bg-transparent disabled:cursor-default transition-colors">
                                <p className="font-medium text-gray-800">{inv.testName}</p>
                                {inv.result === 'Processing...' ? (
                                    // Show a spinner while the result is being generated.
                                    <div className="flex items-center pl-2 mt-1"><Spinner size="sm" className="mr-2 border-plexus-accent/50" /><p className="text-gray-500 italic">{inv.result}</p></div>
                                ) : (
                                    // Show the summary result once available.
                                    <p className="text-gray-600 text-sm pl-2 mt-1 truncate">{inv.result}</p>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
          </Card>
        </div>
      </div>

      {/* Fixed footer bar for the final diagnosis button. It remains visible at the bottom of the screen. */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 z-20">
          <div className="max-w-screen-2xl mx-auto flex justify-end">
              <button onClick={() => setShowDiagnosisModal(true)} className="bg-plexus-blue text-white font-bold py-3 px-6 rounded-lg hover:bg-plexus-blue-dark transition-all ease-plexus-ease transform hover:scale-105 shadow-plexus-lg">Propose Final Diagnosis</button>
          </div>
      </div>
      
      {/* Final Diagnosis Modal, shown conditionally. */}
      {showDiagnosisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <Card className="w-full max-w-lg bg-white/90 backdrop-blur-md">
                <h2 className="text-2xl font-bold text-plexus-blue mb-4">Final Diagnosis</h2>
                <p className="text-gray-600 mb-6">Enter your final diagnosis and confidence level.</p>
                {/* Text input for the diagnosis. */}
                <input type="text" value={finalDiagnosis} onChange={e => setFinalDiagnosis(e.target.value)} placeholder="Enter final diagnosis..." className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-plexus-accent mb-4"/>
                {/* Slider for confidence level. */}
                <label className="block text-gray-700 font-medium mb-2">Confidence: {confidence}%</label>
                <input type="range" min="0" max="100" step="5" value={confidence} onChange={e => setConfidence(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                {/* Action buttons for the modal. */}
                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={() => setShowDiagnosisModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
                    <button onClick={handleSubmitDiagnosis} disabled={!finalDiagnosis.trim() || isSubmitting} className="px-6 py-2 bg-plexus-blue text-white font-bold rounded-lg hover:bg-plexus-blue-dark disabled:bg-gray-400 flex items-center">
                        {isSubmitting ? <Spinner size="sm" /> : 'Submit'}
                    </button>
                </div>
            </Card>
        </div>
      )}

      {/* Report Viewer Modal, shown when a completed report is clicked. */}
      {selectedReport && medicalCase && (
         <ReportViewer
            report={selectedReport}
            patient={medicalCase.patient}
            onClose={() => setSelectedReport(null)}
          />
      )}
    </div>
  );
};
