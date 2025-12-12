// _lib/firebaseAdmin.ts (or wherever this file lives)

import { VercelRequest } from '@vercel/node';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    // 1. Preferred Method: Base64 Encoded Service Account (Best for Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(
          Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
        );
      } catch (e) {
        throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is valid Base64 encoded JSON.');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

    // 2. Alternative: Individual Variables
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Handle both escaped newlines (\\n) and literal newlines
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });

    // 3. Fallback: Application Default Credentials (rarely works on Vercel, useful for local/GCP)
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
    // Log environment status without leaking secrets
    console.log('Environment variables check:', {
      hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    });
    // Throwing here is good; it prevents the app from running in an undefined state
    throw new Error('Failed to initialize Firebase Admin SDK');
  }
}

// Export the initialized admin instance for use in other files (e.g., Firestore)
export { admin };

export interface AuthResult {
  authenticated: boolean;
  uid?: string;
  error?: string | null; // Updated to allow null
}

/**
 * Verifies the authentication token from the request
 * @param req - Vercel request object
 * @returns AuthResult with authentication status and user ID if authenticated
 */
export const verifyAuth = async (req: VercelRequest): Promise<AuthResult> => {
  // Handle case where header might be string[] (rare but possible in Node definitions)
  const authHeader = Array.isArray(req.headers.authorization) 
    ? req.headers.authorization[0] 
    : req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return { authenticated: true, uid: decodedToken.uid, error: null };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authenticated: false, error: 'Invalid or expired token' };
  }
};