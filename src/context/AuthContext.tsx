/**
 * @file AuthContext.tsx
 * @description Authentication context for managing user authentication state,
 * Google OAuth integration, and user usage tracking for rate limiting.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { User, AuthContextType, UserUsageStats } from '../../types';

// Rate limiting constants
const RATE_LIMITS = {
  case_generation: {
    daily: 50,    // 50 cases per day
    weekly: 200   // 200 cases per week
  },
  api_request: {
    hourly: 1000, // 1000 API requests per hour
    daily: 5000   // 5000 API requests per day
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert Firebase user to our User type
const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
  const now = new Date();

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : now,
    lastLoginAt: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : now,
    isBanned: false, // This would be checked against a database in production
    usageStats: {
      casesGeneratedToday: 0,
      casesGeneratedThisWeek: 0,
      lastCaseGeneratedAt: new Date(0), // Never generated
      totalCasesGenerated: 0,
      apiRequestsToday: 0,
      apiRequestsThisHour: 0,
    }
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user data from localStorage on mount
  useEffect(() => {
    const loadUserData = () => {
      try {
        const savedUser = localStorage.getItem('plexus_user');
        const savedUsageStats = localStorage.getItem('plexus_usage_stats');

        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          // Convert date strings back to Date objects
          parsedUser.createdAt = new Date(parsedUser.createdAt);
          parsedUser.lastLoginAt = new Date(parsedUser.lastLoginAt);
          parsedUser.usageStats.lastCaseGeneratedAt = new Date(parsedUser.usageStats.lastCaseGeneratedAt);

          if (savedUsageStats) {
            parsedUser.usageStats = { ...parsedUser.usageStats, ...JSON.parse(savedUsageStats) };
          }

          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        // Clear corrupted data
        localStorage.removeItem('plexus_user');
        localStorage.removeItem('plexus_usage_stats');
      }
    };

    loadUserData();
  }, []);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = convertFirebaseUser(firebaseUser);
        setUser(userData);
        setError(null);

        // Save to localStorage
        localStorage.setItem('plexus_user', JSON.stringify(userData));
      } else {
        setUser(null);
        // Clear localStorage
        localStorage.removeItem('plexus_user');
        localStorage.removeItem('plexus_usage_stats');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      // Reset loading state immediately after successful sign-in
      setIsLoading(false);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setIsLoading(true);
      await firebaseSignOut(auth);
      setError(null);
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign out');
      setIsLoading(false);
    }
  };

  // Update user usage statistics
  const updateUserStats = async (stats: Partial<UserUsageStats>) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      usageStats: { ...user.usageStats, ...stats }
    };

    setUser(updatedUser);

    // Save to localStorage
    localStorage.setItem('plexus_user', JSON.stringify(updatedUser));
    localStorage.setItem('plexus_usage_stats', JSON.stringify(updatedUser.usageStats));
  };

  // Check rate limits
  const checkRateLimit = async (action: 'case_generation' | 'api_request'): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> => {
    if (!user) {
      return { allowed: false, remaining: 0, resetTime: new Date() };
    }

    const now = new Date();
    const stats = user.usageStats;
    let allowed = true;
    let remaining = 0;
    let resetTime = now;

    if (action === 'case_generation') {
      // Check daily limit
      if (stats.casesGeneratedToday >= RATE_LIMITS.case_generation.daily) {
        allowed = false;
        remaining = 0;
        // Reset at midnight
        resetTime = new Date(now);
        resetTime.setHours(24, 0, 0, 0);
      } else {
        remaining = RATE_LIMITS.case_generation.daily - stats.casesGeneratedToday;
      }

      // Check weekly limit (if daily limit not exceeded)
      if (allowed && stats.casesGeneratedThisWeek >= RATE_LIMITS.case_generation.weekly) {
        allowed = false;
        remaining = 0;
        // Reset next Monday
        resetTime = new Date(now);
        const daysUntilMonday = (8 - resetTime.getDay()) % 7 || 7;
        resetTime.setDate(resetTime.getDate() + daysUntilMonday);
        resetTime.setHours(0, 0, 0, 0);
      }
    } else if (action === 'api_request') {
      // Check hourly limit
      if (stats.apiRequestsThisHour >= RATE_LIMITS.api_request.hourly) {
        allowed = false;
        remaining = 0;
        // Reset at next hour
        resetTime = new Date(now);
        resetTime.setHours(resetTime.getHours() + 1, 0, 0, 0);
      } else {
        remaining = RATE_LIMITS.api_request.hourly - stats.apiRequestsThisHour;
      }

      // Check daily limit (if hourly limit not exceeded)
      if (allowed && stats.apiRequestsToday >= RATE_LIMITS.api_request.daily) {
        allowed = false;
        remaining = 0;
        // Reset at midnight
        resetTime = new Date(now);
        resetTime.setHours(24, 0, 0, 0);
      }
    }

    return { allowed, remaining, resetTime };
  };

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    signInWithGoogle,
    signOut,
    updateUserStats,
    checkRateLimit,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
