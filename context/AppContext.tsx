/**
 * @file AppContext.tsx
 * @description This file implements the application's global state management using React's Context API and the `useReducer` hook.
 * It provides a centralized store for data that needs to be shared across different components without prop drilling,
 * such as the list of medical cases, user progress, and loading states.
 *
 * Core Concepts:
 * - **Context (`AppContext`):** A mechanism to pass data through the component tree without having to pass props down manually at every level.
 * - **Reducer (`appReducer`):** A function that manages state transitions. It takes the current state and an action, and returns a new state. This pattern helps to keep state logic predictable and centralized.
 * - **Provider (`AppProvider`):** A component that wraps the application (or a part of it) and makes the context value available to all descendant components.
 * - **Hook (`useAppContext`):** A custom hook that simplifies the process for components to access the context's value.
 */

import React, { createContext, useReducer, useContext, ReactNode } from 'react';
import { MedicalCase, UserProgress, Specialty, RaritySelection } from '../types';
// FIX: Update import to use the new API service from within the src directory.
import { generatePatientCase } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';

// Defines the shape of our global application state.
interface AppState {
  cases: MedicalCase[]; // An array to store all medical cases generated during the user's session.
  userProgress: UserProgress; // An object for tracking user statistics (currently just completed cases).
  isLoading: boolean; // A global flag to indicate when a background process (like case generation) is running. Used to show/hide the LoadingOverlay.
  error: string | null; // Stores any global error messages, e.g., if case generation fails.
  recentDiagnoses: string[]; // Tracks the last few diagnoses to avoid repetition and ensure case variety.
}

// Defines the possible actions that can be dispatched to update the state.
// Using a discriminated union for actions provides strong type-checking in the reducer.
type Action =
  | { type: 'START_NEW_CASE' }
  | { type: 'NEW_CASE_SUCCESS'; payload: MedicalCase }
  | { type: 'NEW_CASE_FAILURE'; payload: string }
  | { type: 'COMPLETE_CASE'; payload: { caseId: string } };

// The initial state of the application when it first loads.
const initialState: AppState = {
  cases: [],
  userProgress: {
    completedCases: 0,
    averageConfidence: 0,
    correctDiagnosisRate: 0,
  },
  isLoading: false,
  error: null,
  recentDiagnoses: [],
};

// The reducer function. It handles all state transitions based on dispatched actions.
// It's a pure function: it computes the next state based on the current state and action.
const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'START_NEW_CASE':
      // When starting a new case, set isLoading to true to trigger the loading overlay.
      return { ...state, isLoading: true, error: null };
    case 'NEW_CASE_SUCCESS':
      // When a case is successfully generated:
      // 1. Add the new diagnosis to the `recentDiagnoses` list.
      const newDiagnoses = [...state.recentDiagnoses, action.payload.underlyingDiagnosis];
      // 2. Trim the list to prevent it from growing indefinitely and to ensure diversity in case generation.
      const trimmedDiagnoses = newDiagnoses.slice(Math.max(newDiagnoses.length - 15, 0));
      // 3. Add the new case to the `cases` array and set isLoading to false.
      return {
        ...state,
        isLoading: false,
        cases: [...state.cases, action.payload],
        recentDiagnoses: trimmedDiagnoses,
      };
    case 'NEW_CASE_FAILURE':
      // If case generation fails, store the error message and stop the loading state.
      return { ...state, isLoading: false, error: action.payload };
    case 'COMPLETE_CASE':
        // When a user submits their final diagnosis:
        // 1. Find the corresponding case and update its status to 'completed'.
        const updatedCases: MedicalCase[] = state.cases.map(c => 
            c.id === action.payload.caseId ? { ...c, status: 'completed' } : c
        );
        // 2. Increment the user's completed case count.
        return { 
            ...state, 
            cases: updatedCases,
            userProgress: {
                ...state.userProgress,
                completedCases: state.userProgress.completedCases + 1,
            }
        };
    default:
      return state;
  }
};

// Defines the shape of the context value that will be provided to consuming components.
// It includes the current state and functions to dispatch actions.
interface AppContextType {
  state: AppState;
  startNewCase: (specialty: Specialty, rarity: RaritySelection) => Promise<MedicalCase | null>;
  getCaseById: (id: string) => MedicalCase | undefined;
  completeCase: (id: string) => void;
}

// Create the context with an initial value of `undefined`.
const AppContext = createContext<AppContextType | undefined>(undefined);

// The AppProvider component. This component will wrap our entire application in `App.tsx`.
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user, updateUserStats, checkRateLimit } = useAuth();

  // Asynchronous function to handle new case generation.
  // This abstracts the logic away from the HomeScreen component.
  const startNewCase = async (specialty: Specialty, rarity: RaritySelection) => {
    // Check rate limits before proceeding
    const rateLimitCheck = await checkRateLimit('case_generation');
    if (!rateLimitCheck.allowed) {
      const resetTime = rateLimitCheck.resetTime;
      const timeUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60)); // hours
      const message = `Rate limit exceeded. You can generate ${rateLimitCheck.remaining} more cases. Try again in ${timeUntilReset} hour(s).`;
      dispatch({ type: 'NEW_CASE_FAILURE', payload: message });
      return null;
    }

    dispatch({ type: 'START_NEW_CASE' });
    try {
      // Call the new API service to generate a case, passing the list of recent diagnoses to avoid repeats.
      const newCase = await generatePatientCase(specialty, rarity, state.recentDiagnoses);
      dispatch({ type: 'NEW_CASE_SUCCESS', payload: newCase });

      // Update user statistics for rate limiting
      if (user) {
        const now = new Date();
        const lastGenerated = user.usageStats.lastCaseGeneratedAt;
        const isNewDay = !lastGenerated || lastGenerated.toDateString() !== now.toDateString();
        const isNewWeek = !lastGenerated || (now.getTime() - lastGenerated.getTime()) > (7 * 24 * 60 * 60 * 1000);

        await updateUserStats({
          casesGeneratedToday: isNewDay ? 1 : user.usageStats.casesGeneratedToday + 1,
          casesGeneratedThisWeek: isNewWeek ? 1 : user.usageStats.casesGeneratedThisWeek + 1,
          lastCaseGeneratedAt: now,
          totalCasesGenerated: user.usageStats.totalCasesGenerated + 1,
        });
      }

      return newCase;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      dispatch({ type: 'NEW_CASE_FAILURE', payload: message });
      return null;
    }
  };
  
  // A utility function to retrieve a specific case by its ID.
  // This is used by the CaseScreen and FeedbackScreen to get the data they need.
  const getCaseById = (id: string) => state.cases.find(c => c.id === id);

  // Function to mark a case as completed.
  const completeCase = (id: string) => {
    dispatch({ type: 'COMPLETE_CASE', payload: { caseId: id } });
  };

  // Provide the state and action-dispatching functions to all child components.
  return (
    <AppContext.Provider value={{ state, startNewCase, getCaseById, completeCase }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook for easy context consumption.
// Components can simply call `useAppContext()` to get access to the global state and functions.
// It also includes a check to ensure it's used within an `AppProvider`.
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
