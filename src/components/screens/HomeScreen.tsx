/**
 * @file HomeScreen.tsx
 * @description Landing page with authentication status and simulation setup.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Specialty, RaritySelection } from '../../types';
import { SPECIALTIES, RARITY_LEVELS } from '../../constants';
import { useAppContext } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { CASE_GENERATION_TIPS } from '../../constants/loadingMessages';

// 1. ADD THIS IMPORT <---
import { useAuth } from '../../context/AuthContext';

const HeartbeatWave: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M0,10 H20 L25,5 L30,15 L35,8 L40,10 H100" />
  </svg>
);

export const HomeScreen: React.FC = () => {
  const [specialty, setSpecialty] = useState<Specialty>(Specialty['General Medicine']);
  const [rarity, setRarity] = useState<RaritySelection>('Any');
  const [isSpecialtyModalOpen, setIsSpecialtyModalOpen] = useState(false);
  const { startNewCase, state } = useAppContext();
  const navigate = useNavigate();
  const [quoteIndex, setQuoteIndex] = useState(0);

  // 2. ADD AUTH LOGIC HERE <---
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      // The ProtectedRoute will handle the redirect to /login automatically
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * CASE_GENERATION_TIPS.length));
    const quoteInterval = setInterval(() => {
      setQuoteIndex(prevIndex => {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * CASE_GENERATION_TIPS.length);
        } while (newIndex === prevIndex && CASE_GENERATION_TIPS.length > 1);
        return newIndex;
      });
    }, 8000);
    return () => clearInterval(quoteInterval);
  }, []);

  const handleStartCase = async () => {
    const newCase = await startNewCase(specialty, rarity);
    if (newCase) {
      navigate(`/case/${newCase.id}`);
    }
  };

  const handleSpecialtySelect = (selectedSpecialty: Specialty) => {
    setSpecialty(selectedSpecialty);
    setIsSpecialtyModalOpen(false);
  };

  return (
    <>
      {state.isLoading && <LoadingOverlay title="Preparing Simulation" messages={CASE_GENERATION_TIPS} />}
      
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-plexus-blue to-plexus-accent bg-[200%_200%] animate-gradient relative overflow-hidden">
        
        {/* 3. ADD THIS HEADER SECTION <--- */}
        {/* We use 'absolute top-0' so it sits on top of the gradient without pushing the center content down */}
        <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
          {/* Small Logo (Optional, can be hidden since you have the big one in center) */}
          <div className="flex items-center gap-2 text-white/80">
            <div className="w-6 h-6 border border-white/40 rounded flex items-center justify-center text-xs font-bold">P</div>
            <span className="font-semibold tracking-wide text-sm">PLEXUS</span>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="hidden md:flex flex-col items-end text-white">
              <span className="text-sm font-medium">{user?.displayName || 'Medical Professional'}</span>
              <span className="text-xs text-white/60">{user?.email}</span>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-sm overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.displayName?.charAt(0) || 'U'}</span>
              )}
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="ml-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-white text-xs font-medium transition-all"
            >
              Log Out
            </button>
          </div>
        </header>
        {/* --- END HEADER SECTION --- */}


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
              <button
                onClick={() => setIsSpecialtyModalOpen(true)}
                className="w-full flex justify-between items-center text-left p-3 bg-white/20 border border-white/30 rounded-lg hover:bg-white/30 focus:ring-4 focus:ring-plexus-accent/50 transition-all ease-plexus-ease text-white"
                aria-haspopup="true"
                aria-expanded={isSpecialtyModalOpen}
              >
                <span>{specialty}</span>
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

            <button
              onClick={handleStartCase}
              disabled={state.isLoading}
              className="w-full bg-white text-plexus-blue font-bold py-3 px-4 rounded-lg text-lg hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-white/50 transition-all duration-300 ease-plexus-ease disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-wait flex items-center justify-center transform hover:scale-105"
            >
              Begin Simulation
            </button>
            {state.error && <p className="text-red-300 text-sm mt-2 text-center">{state.error}</p>}
        </div>

        <footer className="absolute bottom-4 right-4 text-white/60 text-sm max-w-xs text-right">
            <p key={quoteIndex} className="italic animate-fade-in">{CASE_GENERATION_TIPS[quoteIndex]}</p>
        </footer>

        {isSpecialtyModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in" role="dialog" aria-modal="true">
            <Card className="w-full max-w-lg relative bg-white/90 backdrop-blur-md">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SPECIALTIES.map((s) => {
                  const isSelected = specialty === s;
                  return (
                    <button
                      key={s}
                      onClick={() => handleSpecialtySelect(s)}
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