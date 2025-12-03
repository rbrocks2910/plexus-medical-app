/**
 * @file LoginScreen.tsx
 * @description Authentication screen component for Google OAuth sign-in.
 * Provides a clean, medical-themed interface for user authentication.
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoadingOverlay } from '../ui/LoadingOverlay';

// Medical-themed loading messages for authentication
const AUTH_LOADING_MESSAGES = [
  "Verifying medical credentials...",
  "Accessing patient database...",
  "Initializing diagnostic protocols...",
  "Loading medical case library...",
  "Preparing simulation environment...",
  "Authenticating healthcare professional...",
];

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle, isLoading, error } = useAuth();

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };

  return (
    <>
      {isLoading && <LoadingOverlay title="Authenticating" messages={AUTH_LOADING_MESSAGES} />}

      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-plexus-blue to-plexus-accent bg-[200%_200%] animate-gradient relative overflow-hidden">
        {/* The decorative background wave */}
        <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] max-w-none text-white/10 animate-pulse-heart" viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0,10 H20 L25,5 L30,15 L35,8 L40,10 H100" />
        </svg>

        {/* Main Branding Section */}
        <div className="relative z-10 text-center text-white mb-8">
          <h1 className="text-6xl font-bold">Plexus</h1>
          <p className="text-xl text-white/80 mt-2">Where Medicine Comes Alive.</p>
          <p className="text-sm text-white/60 mt-4">Secure Authentication Required</p>
        </div>

        {/* Authentication Card */}
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8 text-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-white/70 text-sm">
                Sign in with your Google account to access medical case simulations
              </p>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-white/50 transition-all duration-300 ease-plexus-ease disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-wait transform hover:scale-105"
            >
              {/* Google Logo */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Terms and Privacy */}
            <div className="mt-6 text-xs text-white/50">
              <p>
                By signing in, you agree to our{' '}
                <a href="#" className="underline hover:text-white/70">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="underline hover:text-white/70">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-4 right-4 text-white/60 text-sm max-w-xs text-right">
          <p className="italic">
            "The best way to learn medicine is to practice with real cases."
          </p>
        </footer>
      </div>
    </>
  );
};
