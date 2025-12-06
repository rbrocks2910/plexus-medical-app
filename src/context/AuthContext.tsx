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
import { User, AuthContextType, UserUsageStats } from '../types';

// Default limits for rate limiting
const DEFAULT_RATE_LIMITS = {
  api_request: {
    hourly: 1000, // 1000 API requests per hour
    daily: 5000   // 5000 API requests per day
  }
};

// Subscription limits for case generation
const SUBSCRIPTION_LIMITS = {
  free: {
    daily: 1,    // 1 case per day for free users
  },
  premium: {
    daily: 30,   // 30 cases per day for premium users
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert Firebase user to our User type
const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
  const now = new Date();

  // Create default free subscription when user is created
  const defaultSubscription = {
    tier: 'free' as const,
    startDate: now,
    endDate: null,
    isActive: true,
    casesUsedToday: 0,
    maxCasesPerDay: SUBSCRIPTION_LIMITS.free.daily,
  };

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
      subscription: defaultSubscription,
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
      const result = await signInWithPopup(auth, googleProvider);
      // Immediately set user state from the sign-in result
      const userData = convertFirebaseUser(result.user);
      setUser(userData);
      setError(null);
      // Save to localStorage
      localStorage.setItem('plexus_user', JSON.stringify(userData));
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

  // Update subscription information
  const updateSubscription = async (subscriptionUpdate: Partial<Subscription>) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      usageStats: {
        ...user.usageStats,
        subscription: {
          ...user.usageStats.subscription!,
          ...subscriptionUpdate
        }
      }
    };

    setUser(updatedUser);

    // Save to localStorage
    localStorage.setItem('plexus_user', JSON.stringify(updatedUser));
    localStorage.setItem('plexus_usage_stats', JSON.stringify(updatedUser.usageStats));
  };

  // Subscribe to premium tier
  const subscribeToPremium = async () => {
    if (!user) return;

    const now = new Date();
    // In a real app, you would process payment before updating the subscription
    // For now, we'll just update the subscription to premium
    const premiumSubscription = {
      tier: 'premium' as const,
      startDate: now,
      // For demo purposes, set end date to 30 days from now
      // In a real app, this would be handled by your payment system
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      casesUsedToday: 0, // Reset today's count on subscription
      maxCasesPerDay: SUBSCRIPTION_LIMITS.premium.daily,
    };

    const updatedUser = {
      ...user,
      usageStats: {
        ...user.usageStats,
        subscription: premiumSubscription
      }
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
      // For case generation, we'll use subscription limits instead of fixed limits
      // This will be handled by the new canGenerateCase function
      return await canGenerateCase();
    } else if (action === 'api_request') {
      // Check hourly limit
      if (stats.apiRequestsThisHour >= DEFAULT_RATE_LIMITS.api_request.hourly) {
        allowed = false;
        remaining = 0;
        // Reset at next hour
        resetTime = new Date(now);
        resetTime.setHours(resetTime.getHours() + 1, 0, 0, 0);
      } else {
        remaining = DEFAULT_RATE_LIMITS.api_request.hourly - stats.apiRequestsThisHour;
      }

      // Check daily limit (if hourly limit not exceeded)
      if (allowed && stats.apiRequestsToday >= DEFAULT_RATE_LIMITS.api_request.daily) {
        allowed = false;
        remaining = 0;
        // Reset at midnight
        resetTime = new Date(now);
        resetTime.setHours(24, 0, 0, 0);
      }
    }

    return { allowed, remaining, resetTime };
  };

  // Check if user can generate a case based on subscription limits
  const canGenerateCase = async (): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> => {
    if (!user || !user.usageStats.subscription) {
      return { allowed: false, remaining: 0, resetTime: new Date() };
    }

    const now = new Date();
    const subscription = user.usageStats.subscription;
    const currentDay = now.toDateString();
    const lastGeneratedDay = user.usageStats.lastCaseGeneratedAt.toDateString();

    // If it's a new day, reset the casesUsedToday counter
    if (lastGeneratedDay !== currentDay) {
      // Update the subscription's casesUsedToday to 0
      await updateSubscription({ casesUsedToday: 0 });

      // Also reset the casesGeneratedToday counter
      await updateUserStats({ casesGeneratedToday: 0, lastCaseGeneratedAt: new Date(0) });

      // Update the last generated date to today so the check works properly
      subscription.casesUsedToday = 0;
    }

    const remaining = subscription.maxCasesPerDay - subscription.casesUsedToday;
    let allowed = remaining > 0;

    // Set reset time to next midnight
    const resetTime = new Date(now);
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);

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
    subscribeToPremium,
    updateSubscription,
    canGenerateCase,
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
