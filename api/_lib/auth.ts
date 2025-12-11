import { VercelRequest } from '@vercel/node';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    // Initialize with service account from environment variables
    // For this to work in production, you'll need to set up the service account credentials
    // as environment variables in Vercel (e.g., GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.warn('Firebase Admin SDK initialization failed. Using application default.', error);
    // Fallback to application default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
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