/**
 * @file HomeScreen.tsx
 * @description This component serves as the landing page for the Plexus application.
 * Its primary functions are:
 * 1.  Displaying the application's branding and mission statement.
 * 2.  Allowing the user to select a medical specialty for the simulation.
 * 3.  Initiating the case generation process by calling the `startNewCase` function from the AppContext.
 * 4.  Navigating the user to the `CaseScreen` once a new case has been successfully created.
 * 5.  Displaying a loading overlay and error messages related to the case generation process.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Specialty, RaritySelection } from '../../types';
import { SPECIALTIES, RARITY_LEVELS } from '../../constants';
import { useAppContext } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { CASE_GENERATION_TIPS } from '../../constants/loadingMessages';

// A simple decorative SVG component for the background heartbeat wave effect.
// Its purpose is purely aesthetic, adding a subtle medical theme and visual interest to the landing page.
const HeartbeatWave: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0,10 H20 L25,5 L30,15 L35,8 L40,10 H100" />
    </svg>
);

export const HomeScreen: React.FC = () => {
  // State for the currently selected specialty. Defaults to 'General Medicine'.
  const [specialty, setSpecialty] = useState<Specialty>(Specialty['General Medicine']);
  // State for the currently selected case rarity. Defaults to 'Any'.
  const [rarity, setRarity] = useState<RaritySelection>('Any');
  // State to control the visibility of the specialty selection modal.
  const [isSpecialtyModalOpen, setIsSpecialtyModalOpen] = useState(false);
  // Accessing global state and functions from the AppContext.
  const { startNewCase, state } = useAppContext();
  // Hook for programmatic navigation.
  const navigate = useNavigate();
  // State to manage the currently displayed quote in the footer.
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Effect hook to cycle through the medical quotes/tips in the footer.
  // This adds a bit of personality and provides useful information to the user while they are on the home screen.
  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * CASE_GENERATION_TIPS.length)); // Start with a random quote.
    const quoteInterval = setInterval(() => {
      setQuoteIndex(prevIndex => {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * CASE_GENERATION_TIPS.length);
        } while (newIndex === prevIndex && CASE_GENERATION_TIPS.length > 1); // Ensure new quote is different.
        return newIndex;
      });
    }, 8000);
    return () => clearInterval(quoteInterval);
  }, []);

  // Handler function for the "Begin Simulation" button.
  const handleStartCase = async () => {
    // Calls the `startNewCase` function from AppContext, which triggers the API call and global loading state.
    const newCase = await startNewCase(specialty, rarity);
    // If the case is created successfully, navigate to the CaseScreen for that specific case ID.
    if (newCase) {
      navigate(`/case/${newCase.id}`);
    }
  };

  // Handler for selecting a specialty from the modal.
  const handleSpecialtySelect = (selectedSpecialty: Specialty) => {
    setSpecialty(selectedSpecialty);
    setIsSpecialtyModalOpen(false); // Close the modal after selection.
  };

  return (
    <>
      {/* Conditionally render the LoadingOverlay based on the global `isLoading` state from AppContext. */}
      {state.isLoading && <LoadingOverlay title="Preparing Simulation" messages={CASE_GENERATION_TIPS} />}
      
      {/* Main container with animated gradient background and a subtle heartbeat SVG for visual appeal. */}
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-plexus-blue to-plexus-accent bg-[200%_200%] animate-gradient relative overflow-hidden">
        {/* The decorative background wave. It's set to a large size and pulses gently to create atmosphere. */}
        <HeartbeatWave className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] max-w-none text-white/10 animate-pulse-heart" />
        
        {/* Main Branding Section */}
        <div className="relative z-10 text-center text-white">
            <h1 className="text-6xl font-bold">Plexus</h1>
            <p className="text-xl text-white/80 mt-2">Where Medicine Comes Alive.</p>
        </div>
        
        {/* Main Interaction Card */}
        <div className="relative z-10 mt-12 w-full max-w-sm text-center">
            <div className="mb-4">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Medical Speciality
              </label>
              {/* This button doesn't submit a form, but opens the specialty selection modal. */}
              <button
                onClick={() => setIsSpecialtyModalOpen(true)}
                className="w-full flex justify-between items-center text-left p-3 bg-white/20 border border-white/30 rounded-lg hover:bg-white/30 focus:ring-4 focus:ring-plexus-accent/50 transition-all ease-plexus-ease text-white"
                aria-haspopup="true"
                aria-expanded={isSpecialtyModalOpen}
              >
                <span>{specialty}</span>
                {/* Chevron icon to indicate it's a dropdown-like button. */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
                <label htmlFor="rarity-slider" className="block text-sm font-medium text-white/80 mb-2">
                    Case Rarity: <span className="font-bold text-white">{rarity}</span>
                </label>
                <input
                    id="rarity-slider"
                    type="range"
                    min="0"
                    max={RARITY_LEVELS.length - 1}
                    value={RARITY_LEVELS.indexOf(rarity)}
                    onChange={(e) => setRarity(RARITY_LEVELS[parseInt(e.target.value, 10)])}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-plexus-accent"
                />
            </div>

            {/* The primary call-to-action button to start the simulation. */}
            <button
              onClick={handleStartCase}
              disabled={state.isLoading}
              className="w-full bg-white text-plexus-blue font-bold py-3 px-4 rounded-lg text-lg hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-white/50 transition-all duration-300 ease-plexus-ease disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-wait flex items-center justify-center transform hover:scale-105"
            >
              Begin Simulation
            </button>
            {/* Display error message from AppContext if case generation fails, providing user feedback. */}
            {state.error && <p className="text-red-300 text-sm mt-2 text-center">{state.error}</p>}
        </div>

        {/* Footer with cycling quotes for an engaging user experience, making waiting times feel shorter and more interesting. */}
        <footer className="absolute bottom-4 right-4 text-white/60 text-sm max-w-xs text-right">
            {/* The `key` prop is crucial here. Changing the key forces React to re-mount the component, which re-triggers the `animate-fade-in` animation for each new quote. */}
            <p key={quoteIndex} className="italic animate-fade-in">{CASE_GENERATION_TIPS[quoteIndex]}</p>
        </footer>

        {/* The Specialty Selection Modal, rendered conditionally based on the `isSpecialtyModalOpen` state. */}
        {isSpecialtyModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in" role="dialog" aria-modal="true">
            {/* The Card component provides a consistent, styled container for the modal content. */}
            <Card className="w-full max-w-lg relative bg-white/90 backdrop-blur-md">
              {/* Close button for the modal. */}
              <button
                  onClick={() => setIsSpecialtyModalOpen(false)}
                  className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-plexus-accent"
                  aria-label="Close speciality selection"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
              </button>
              <h2 className="text-2xl font-bold text-plexus-blue mb-6 text-center">Select a Speciality</h2>
              {/* Grid layout for the specialty buttons, providing a clear and easy-to-tap interface. */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SPECIALTIES.map((s) => {
                  const isSelected = specialty === s;
                  return (
                    <button
                      key={s}
                      onClick={() => handleSpecialtySelect(s)}
                      // Dynamic classes are used to visually highlight the currently selected specialty and provide hover feedback.
                      // This makes the UI feel responsive and intuitive.
                      className={`
                        p-3 rounded-lg text-center font-medium transition-all duration-200 ease-plexus-ease border-2
                        flex items-center justify-center text-sm
                        ${s === Specialty['General Medicine'] ? 'col-span-2 sm:col-span-3 bg-gray-50' : ''}
                        ${isSelected
                          ? 'bg-plexus-blue text-white border-plexus-blue-dark shadow-md scale-105'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-plexus-accent'
                        }
                      `}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};