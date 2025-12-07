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
import { auth, googleProvider, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { User, AuthContextType, UserUsageStats, Subscription } from '../types';
import {
  createUserProfile,
  getUserSubscription,
  updateUserStats as updateFirestoreUserStats,
  updateUserSubscription as updateFirestoreUserSubscription
} from '../services/firestoreService';
import { convertFirestoreUser } from '../utils/firestoreHelpers';

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
    total: 2,    // 2 total cases for free users
  },
  premium: {
    daily: 30,   // 30 cases per day for premium users
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert Firebase user to our User type with default free subscription
const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
  const now = new Date();

  // Create default free subscription when user is created
  const defaultSubscription = {
    tier: 'free' as const,
    startDate: now,
    endDate: null,
    isActive: true,
    totalCasesUsed: 0,
    maxTotalCases: SUBSCRIPTION_LIMITS.free.total,
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
  const [unsubscribeFirestore, setUnsubscribeFirestore] = useState<() => void | null>(null);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Create user profile in Firestore if it doesn't exist
          const userData = convertFirebaseUser(firebaseUser);
          await createUserProfile(userData);

          // Set up real-time listener for user data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              const firestoreUserData = docSnapshot.data();
              const updatedUser = convertFirestoreUser(firestoreUserData, firebaseUser);
              setUser(updatedUser);
            }
          });

          setUnsubscribeFirestore(() => unsubscribe);
          setIsLoading(false);
        } catch (err) {
          console.error('Error setting up user:', err);
          setError(err instanceof Error ? err.message : 'Failed to set up user');
          setIsLoading(false);
        }
      } else {
        // User signed out
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          setUnsubscribeFirestore(null);
        }
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  // Update user usage statistics
  const updateUserStats = async (stats: Partial<UserUsageStats>) => {
    if (!user) return;

    try {
      // Update in Firestore
      await updateFirestoreUserStats(user.uid, stats);

      // The real-time listener will update the local state automatically
    } catch (err) {
      console.error('Error updating user stats:', err);
      throw err;
    }
  };

  // Update subscription information
  const updateSubscription = async (subscriptionUpdate: Partial<Subscription>) => {
    if (!user) return;

    try {
      // Update in Firestore
      await updateFirestoreUserSubscription(user.uid, subscriptionUpdate);

      // The real-time listener will update the local state automatically
    } catch (err) {
      console.error('Error updating subscription:', err);
      throw err;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      // The auth state listener will handle setting the user
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

  // Subscribe to premium tier
  const subscribeToPremium = async () => {
    if (!user) return;

    try {
      const now = new Date();
      // In a real app, you would process payment before updating the subscription
      // For now, we'll just update the subscription to premium
      const premiumSubscription = {
        tier: 'premium' as const,
        startDate: now.toISOString(), // Firestore compatible date format
        // For demo purposes, set end date to 30 days from now
        // In a real app, this would be handled by your payment system
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        totalCasesUsed: user.usageStats.subscription?.totalCasesUsed || 0, // Keep any previously used cases
        maxTotalCases: SUBSCRIPTION_LIMITS.premium.daily, // Premium users get daily cases
      };

      // Update in Firestore
      await updateFirestoreUserSubscription(user.uid, premiumSubscription);
    } catch (err) {
      console.error('Error subscribing to premium:', err);
      throw err;
    }
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

    // For free users, check total cases used
    if (subscription.tier === 'free') {
      const remaining = subscription.maxTotalCases - (subscription.totalCasesUsed || 0);
      const allowed = remaining > 0;

      // Reset time is not applicable for total limit, so we return current time
      return { allowed, remaining, resetTime: now };
    }
    // For premium users, check daily limit
    else {
      const currentDay = now.toDateString();
      const lastGeneratedDay = new Date(user.usageStats.lastCaseGeneratedAt).toDateString();

      // If it's a new day, reset the casesUsedToday counter (for premium users)
      if (lastGeneratedDay !== currentDay) {
        await updateUserStats({ casesGeneratedToday: 0 });
      }

      const remaining = (subscription.maxTotalCases || SUBSCRIPTION_LIMITS.premium.daily) - user.usageStats.casesGeneratedToday;
      const allowed = remaining > 0;

      // Set reset time to next midnight for daily premium limit
      const resetTime = new Date(now);
      resetTime.setDate(resetTime.getDate() + 1);
      resetTime.setHours(0, 0, 0, 0);

      return { allowed, remaining, resetTime };
    }
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
