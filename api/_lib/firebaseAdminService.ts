import admin from 'firebase-admin';
import { DocumentData } from 'firebase-admin/firestore';

// Ensure Firebase Admin SDK is initialized
if (!admin.apps.length) {
  try {
    // Initialize with service account credentials
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error('Failed to initialize Firebase Admin SDK');
  }
}

// Get Firestore instance from Admin SDK
const db = admin.firestore();

/**
 * Firebase Admin service for server-side Firestore operations
 */
export class FirebaseAdminService {
  /**
   * Get a user document by ID
   * @param userId - The ID of the user to retrieve
   * @returns The user document data or null if not found
   */
  static async getUser(userId: string): Promise<DocumentData | null> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      return userDoc.exists ? userDoc.data() as DocumentData : null;
    } catch (error) {
      console.error(`Error getting user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update a user's subscription data
   * @param userId - The ID of the user to update
   * @param subscriptionData - The subscription data to update
   */
  static async updateUserSubscription(userId: string, subscriptionData: any): Promise<void> {
    try {
      await db.collection('users').doc(userId).set({
        subscription: subscriptionData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error(`Error updating user subscription for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create or update a completed case for a user
   * @param userId - The ID of the user
   * @param caseId - The ID of the case
   * @param completedCaseData - The completed case data
   * @returns The ID of the created document
   */
  static async saveCompletedCase(userId: string, caseId: string, completedCaseData: any): Promise<string> {
    try {
      const docRef = await db.collection(`users/${userId}/completedCases`).add({
        ...completedCaseData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error saving completed case for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all completed cases for a user
   * @param userId - The ID of the user
   * @returns Array of completed case data
   */
  static async getCompletedCases(userId: string): Promise<DocumentData[]> {
    try {
      const snapshot = await db
        .collection(`users/${userId}/completedCases`)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting completed cases for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific completed case by ID
   * @param userId - The ID of the user
   * @param caseId - The ID of the case
   * @returns The completed case data or undefined if not found
   */
  static async getCompletedCaseById(userId: string, caseId: string): Promise<DocumentData | undefined> {
    try {
      const doc = await db.collection(`users/${userId}/completedCases`).doc(caseId).get();
      return doc.exists ? { id: doc.id, ...doc.data() as DocumentData } : undefined;
    } catch (error) {
      console.error(`Error getting completed case ${caseId} for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user stats
   * @param userId - The ID of the user to update
   * @param statsUpdate - The stats to update
   */
  static async updateUserStats(userId: string, statsUpdate: any): Promise<void> {
    try {
      await db.collection('users').doc(userId).update({
        ...statsUpdate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Error updating user stats for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Increment API usage statistics for a user
   * @param userId - The ID of the user
   */
  static async incrementApiUsage(userId: string): Promise<void> {
    try {
      // First check if the user document exists
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        console.warn(`User document does not exist for user ${userId}, creating with default stats`);
        // Create user document with default stats if it doesn't exist
        await db.collection('users').doc(userId).set({
          usageStats: {
            apiRequestsToday: 1,
            apiRequestsThisHour: 1,
            casesGeneratedToday: 0,
            casesGeneratedThisWeek: 0,
            lastCaseGeneratedAt: null,
            totalCasesGenerated: 0,
            subscription: {
              tier: 'free',
              startDate: admin.firestore.FieldValue.serverTimestamp(),
              endDate: null,
              isActive: true,
              totalCasesUsed: 0,
              maxTotalCases: 2,
            }
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
      }

      // Update existing document with increment operation
      await db.collection('users').doc(userId).update({
        'usageStats.apiRequestsToday': admin.firestore.FieldValue.increment(1),
        'usageStats.apiRequestsThisHour': admin.firestore.FieldValue.increment(1),
        'updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Error incrementing API usage for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Reset daily usage statistics at the start of each day
   * @param userId - The ID of the user
   */
  static async resetDailyUsage(userId: string): Promise<void> {
    try {
      await db.collection('users').doc(userId).update({
        'usageStats.apiRequestsToday': 0,
        'updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Error resetting daily usage for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Reset hourly usage statistics at the start of each hour
   * @param userId - The ID of the user
   */
  static async resetHourlyUsage(userId: string): Promise<void> {
    try {
      await db.collection('users').doc(userId).update({
        'usageStats.apiRequestsThisHour': 0,
        'updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Error resetting hourly usage for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create or update user profile
   * @param userId - The ID of the user
   * @param userData - The user data to set
   */
  static async createOrUpdateUserProfile(userId: string, userData: any): Promise<void> {
    try {
      await db.collection('users').doc(userId).set({
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error(`Error creating/updating user profile for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get Firestore instance for direct access if needed
   */
  static getFirestore() {
    return db;
  }
}