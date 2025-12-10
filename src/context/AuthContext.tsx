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

// Check if Firebase services are available
const isFirebaseAvailable = auth !== null && db !== null && googleProvider !== undefined;
if (!isFirebaseAvailable) {
  console.warn('Firebase services are not available. Authentication will not work.');
}

// Default limits for rate limiting
const DEFAULT_RATE_LIMITS = {
  api_request: {
    hourly: 1000, // 1000 API requests per hour
    daily: 5000   // 5000 API requests per day
  }
};

// Subscription limits for case generation
// ✅ Now both are TOTAL over plan duration, NOT per day
const SUBSCRIPTION_LIMITS = {
  free: {
    total: 2,    // 2 total cases for free users
  },
  premium: {
    total: 30,   // 30 total cases for the entire monthly plan
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert Firebase user to our User type with default free subscription
const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
  const now = new Date();

  // Create default free subscription when user is created
  const defaultSubscription: Subscription = {
    tier: 'free',
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
  // ✅ fixed typing: function OR null
  const [unsubscribeFirestore, setUnsubscribeFirestore] =
    useState<(() => void) | null>(null);

  // Firebase auth state listener
  useEffect(() => {
    // Only set up auth listener if Firebase is available
    if (!isFirebaseAvailable) {
      console.warn('Firebase not available, skipping auth state listener setup');
      setIsLoading(false);
      return;
    }

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
      // Only call unsubscribeAuth if Firebase is available and auth exists
      if (isFirebaseAvailable && typeof unsubscribeAuth === 'function') {
        unsubscribeAuth();
      }
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  // Update user usage statistics
  const updateUserStats = async (stats: Partial<UserUsageStats>) => {
    if (!user || !isFirebaseAvailable) return;

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
    if (!user || !isFirebaseAvailable) return;

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
    if (!isFirebaseAvailable) {
      console.error('Firebase not available. Cannot sign in with Google.');
      setError('Authentication service is not available. Please check console for details.');
      setIsLoading(false);
      return;
    }

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
    if (!isFirebaseAvailable) {
      console.error('Firebase not available. Cannot sign out.');
      setError('Authentication service is not available. Please check console for details.');
      setIsLoading(false);
      return;
    }

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
  // ✅ Now sets a TOTAL limit of 30 for the plan duration
  const subscribeToPremium = async () => {
    if (!user || !isFirebaseAvailable) return;

    try {
      const now = new Date();
      // In a real app, you would process payment before updating the subscription
      // For now, we'll just update the subscription to premium
      const premiumSubscription: Subscription = {
        tier: 'premium',
        startDate: now.toISOString(), // Firestore compatible date format
        // For demo purposes, set end date to 30 days from now
        // In a real app, this would be handled by your payment system
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        totalCasesUsed: user.usageStats.subscription?.totalCasesUsed || 0, // Keep any previously used cases
        maxTotalCases: SUBSCRIPTION_LIMITS.premium.total, // ✅ 30 cases total per plan
      };

      // Update in Firestore
      await updateFirestoreUserSubscription(user.uid, premiumSubscription);
    } catch (err) {
      console.error('Error subscribing to premium:', err);
      throw err;
    }
  };

  // Check rate limits
  const checkRateLimit = async (
    action: 'case_generation' | 'api_request'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> => {
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
  // ✅ Now uses TOTAL cases (free: 2, premium: 30), no daily reset for premium
  const canGenerateCase = async (): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> => {
    if (!user || !user.usageStats.subscription || !isFirebaseAvailable) {
      return { allowed: false, remaining: 0, resetTime: new Date() };
    }

    const now = new Date();
    const subscription = user.usageStats.subscription;

    // Determine maxTotalCases fallback based on tier
    const defaultMax =
      subscription.tier === 'premium'
        ? SUBSCRIPTION_LIMITS.premium.total
        : SUBSCRIPTION_LIMITS.free.total;

    const maxTotalCases = subscription.maxTotalCases ?? defaultMax;
    const used = subscription.totalCasesUsed || 0;
    const remaining = maxTotalCases - used;
    const allowed = remaining > 0;

    // For total-plan limits, "resetTime" can be the end of the current plan (if set),
    // otherwise just return now.
    const resetTime = subscription.endDate ? new Date(subscription.endDate) : now;

    return { allowed, remaining, resetTime };
  };

  // Check and update subscription status based on case usage and expiration
  const checkAndUpdateSubscription = async () => {
    if (!user || !user.usageStats.subscription || !isFirebaseAvailable) return;

    const subscription = user.usageStats.subscription;
    const defaultMax =
      subscription.tier === 'premium'
        ? SUBSCRIPTION_LIMITS.premium.total
        : SUBSCRIPTION_LIMITS.free.total;

    const maxTotalCases = subscription.maxTotalCases ?? defaultMax;
    const used = subscription.totalCasesUsed || 0;

    // Check if the subscription has expired
    if (subscription.tier === 'premium' && subscription.endDate) {
      const now = new Date();
      const endDate = new Date(subscription.endDate);
      if (now > endDate) {
        // Downgrade expired premium subscription to free
        const downgradeSubscription: Subscription = {
          tier: 'free',
          startDate: subscription.startDate,
          endDate: null,
          isActive: true,
          totalCasesUsed: used, // Keep the same usage count
          maxTotalCases: SUBSCRIPTION_LIMITS.free.total,
        };

        await updateFirestoreUserSubscription(user.uid, downgradeSubscription);
        return; // Exit early after downgrading for expiration
      }
    }

    // Check if the user has exceeded their case limit
    // Downgrade only when they've used MORE than their allowed cases, not when equal
    if (used > maxTotalCases && subscription.tier === 'premium') {
      // Downgrade to free tier
      const downgradeSubscription: Subscription = {
        tier: 'free',
        startDate: subscription.startDate,
        endDate: null,
        isActive: true,
        totalCasesUsed: used, // Keep the same usage count
        maxTotalCases: SUBSCRIPTION_LIMITS.free.total,
      };

      await updateFirestoreUserSubscription(user.uid, downgradeSubscription);
    } else if (used < maxTotalCases && subscription.tier === 'free' && maxTotalCases > SUBSCRIPTION_LIMITS.free.total) {
      // This scenario shouldn't happen with the current logic, but adding for completeness
      // If somehow the user has a free tier but more than free limit, update maxTotalCases
      await updateFirestoreUserSubscription(user.uid, {
        maxTotalCases: SUBSCRIPTION_LIMITS.free.total,
      });
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
    checkAndUpdateSubscription,
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
