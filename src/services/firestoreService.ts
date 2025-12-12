import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Subscription, MedicalCase, CaseFeedback, ChatMessage, InvestigationResult } from '../types';

/**
 * Firestore service functions for managing user subscriptions and completed cases
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
    // Use dot notation to update specific fields within the subscription object to avoid overwriting the entire object
    const updateData: any = {
      'updatedAt': serverTimestamp()
    };

    // Add each subscription field to the update data using dot notation
    Object.entries(subscriptionUpdate).forEach(([key, value]) => {
      updateData[`subscription.${key}`] = value;
    });

    await updateDoc(userDocRef, updateData);
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

/**
 * Save completed case to Firestore
 */
export interface CompletedCase {
  id: string;
  userId: string;
  caseId: string;
  medicalCase: Omit<MedicalCase, 'id'>; // Exclude id since we're using Firestore's document ID
  userDiagnosis: string;
  confidence: number;
  correctness: CaseFeedback['correctness'];
  reasoningAnalysis: string;
  finalDiagnosisExplanation: string;
  chatHistory: ChatMessage[];
  investigations: InvestigationResult[];
  differentialDiagnoses: string[];
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

export const saveCompletedCase = async (
  userId: string,
  caseId: string,
  medicalCase: MedicalCase,
  userDiagnosis: string,
  confidence: number,
  feedback: CaseFeedback
): Promise<string> => {
  try {
    // Check if case already exists to prevent duplicates
    const alreadyExists = await isCaseCompleted(userId, caseId);
    if (alreadyExists) {
      console.log(`Case ${caseId} already exists for user ${userId}. Not saving duplicate.`);
      return caseId; // Return the existing case ID
    }

    // Remove the id from medicalCase to avoid conflicts with Firestore's document ID
    const { id, ...medicalCaseWithoutId } = medicalCase;
    const completedCase: Omit<CompletedCase, 'id' | 'userId'> = {
      caseId,
      medicalCase: medicalCaseWithoutId,
      userDiagnosis,
      confidence,
      correctness: feedback.correctness,
      reasoningAnalysis: feedback.reasoningAnalysis,
      finalDiagnosisExplanation: feedback.finalDiagnosisExplanation,
      chatHistory: [], // Will be populated later when we have chat history
      investigations: [], // Will be populated later when we have investigations
      differentialDiagnoses: [], // Will be populated later when we have differential diagnoses
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'users', userId, 'completedCases'), completedCase);
    return docRef.id;
  } catch (error) {
    console.error('Error saving completed case:', error);
    throw error;
  }
};

/**
 * Save completed case with full details
 */
export const saveCompletedCaseWithDetails = async (
  userId: string,
  caseId: string,
  medicalCase: MedicalCase,
  userDiagnosis: string,
  confidence: number,
  feedback: CaseFeedback,
  chatHistory: ChatMessage[],
  investigations: InvestigationResult[],
  differentialDiagnoses: string[]
): Promise<string> => {
  try {
    // Check if case already exists to prevent duplicates
    const alreadyExists = await isCaseCompleted(userId, caseId);
    if (alreadyExists) {
      console.log(`Case ${caseId} already exists for user ${userId}. Not saving duplicate.`);
      return caseId; // Return the existing case ID
    }

    // Remove the id from medicalCase to avoid conflicts with Firestore's document ID
    const { id, ...medicalCaseWithoutId } = medicalCase;
    const completedCase: Omit<CompletedCase, 'id' | 'userId'> = {
      caseId,
      medicalCase: medicalCaseWithoutId,
      userDiagnosis,
      confidence,
      correctness: feedback.correctness,
      reasoningAnalysis: feedback.reasoningAnalysis,
      finalDiagnosisExplanation: feedback.finalDiagnosisExplanation,
      chatHistory: chatHistory || [],
      investigations: investigations || [],
      differentialDiagnoses: differentialDiagnoses || [],
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'users', userId, 'completedCases'), completedCase);
    return docRef.id;
  } catch (error) {
    console.error('Error saving completed case with details:', error);
    throw error;
  }
};

/**
 * Check if a case is already completed by the user
 */
export const isCaseCompleted = async (userId: string, caseId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, 'users', userId, 'completedCases', caseId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking if case is completed:', error);
    throw error;
  }
};

/**
 * Get all completed cases for a user
 */
export const getCompletedCases = async (userId: string): Promise<CompletedCase[]> => {
  try {
    // Check if Firebase is properly initialized before attempting to query
    if (!db) {
      throw new Error('Firebase database is not initialized');
    }

    const q = query(
      collection(db, 'users', userId, 'completedCases'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const cases: CompletedCase[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      cases.push({
        id: doc.id,
        userId,
        caseId: data.caseId,
        medicalCase: data.medicalCase,
        userDiagnosis: data.userDiagnosis,
        confidence: data.confidence,
        correctness: data.correctness,
        reasoningAnalysis: data.reasoningAnalysis,
        finalDiagnosisExplanation: data.finalDiagnosisExplanation,
        chatHistory: data.chatHistory || [],
        investigations: data.investigations || [],
        differentialDiagnoses: data.differentialDiagnoses || [],
        createdAt: data.createdAt
      });
    });

    return cases;
  } catch (error) {
    console.error('Error getting completed cases:', error);
    throw error;
  }
};

/**
 * Get a specific completed case by ID
 */
export const getCompletedCaseById = async (userId: string, caseId: string): Promise<CompletedCase | undefined> => {
  try {
    const docRef = doc(db, 'users', userId, 'completedCases', caseId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId,
        caseId: data.caseId,
        medicalCase: data.medicalCase,
        userDiagnosis: data.userDiagnosis,
        confidence: data.confidence,
        correctness: data.correctness,
        reasoningAnalysis: data.reasoningAnalysis,
        finalDiagnosisExplanation: data.finalDiagnosisExplanation,
        chatHistory: data.chatHistory || [],
        investigations: data.investigations || [],
        differentialDiagnoses: data.differentialDiagnoses || [],
        createdAt: data.createdAt
      };
    }
    return undefined;
  } catch (error) {
    console.error('Error getting completed case by ID:', error);
    throw error;
  }
};