import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Subscription } from '../types';

/**
 * Firestore service functions for managing user subscriptions
 */

/**
 * Get user subscription data from Firestore
 */
export const getUserSubscription = async (userId: string): Promise<Subscription | null> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.subscription || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw error;
  }
};

/**
 * Create or update user subscription in Firestore
 */
export const setUserSubscription = async (userId: string, subscription: Subscription): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, { subscription }, { merge: true });
  } catch (error) {
    console.error('Error setting user subscription:', error);
    throw error;
  }
};

/**
 * Update user subscription in Firestore
 */
export const updateUserSubscription = async (userId: string, subscriptionUpdate: Partial<Subscription>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      'subscription': { ...subscriptionUpdate },
      'updatedAt': serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
};

/**
 * Update user usage stats in Firestore
 */
export const updateUserStats = async (userId: string, statsUpdate: Partial<User['usageStats']>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      'usageStats': { ...statsUpdate },
      'updatedAt': serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
};

/**
 * Create/update user profile in Firestore when user signs in
 */
export const createUserProfile = async (user: User): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Create new user profile with default subscription
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: user.createdAt,
        subscription: user.usageStats.subscription,
        usageStats: user.usageStats,
        updatedAt: serverTimestamp()
      });
    } else {
      // Update existing user profile if needed
      await updateDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    throw error;
  }
};