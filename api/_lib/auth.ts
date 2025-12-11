import { VercelRequest } from '@vercel/node';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    // Check if we have service account credentials in environment variables
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Initialize with service account from base64 encoded JSON in environment variable
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
      // Initialize with individual service account components
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      // Use application default credentials (for deployment on Google Cloud)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error('Failed to initialize Firebase Admin SDK');
  }
}

export interface AuthResult {
  authenticated: boolean;
  uid?: string;
  error?: string;
}

/**
 * Verifies the authentication token from the request
 * @param req - Vercel request object
 * @returns AuthResult with authentication status and user ID if authenticated
 */
export const verifyAuth = async (req: VercelRequest): Promise<AuthResult> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return { authenticated: true, uid: decodedToken.uid, error: null };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authenticated: false, error: 'Invalid token' };
  }
};