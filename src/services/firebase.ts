import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

console.log('Firebase config loaded:', {
  apiKey: firebaseConfig.apiKey ? '***HIDDEN***' : 'MISSING',
  authDomain: firebaseConfig.authDomain || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
  storageBucket: firebaseConfig.storageBucket || 'MISSING',
  messagingSenderId: firebaseConfig.messagingSenderId || 'MISSING',
  appId: firebaseConfig.appId ? '***HIDDEN***' : 'MISSING'
});

// Only initialize Firebase if the config is present
let app;
if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
  try {
    // Check if Firebase has already been initialized
    const existingApps = getApps();
    if (existingApps.length === 0) {
      app = initializeApp(firebaseConfig);
      console.log('Firebase app initialized successfully:', app);
    } else {
      app = existingApps[0]; // Use existing app
      console.log('Firebase app already exists, using existing instance:', app);
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    // Create a placeholder app to prevent other parts of the app from breaking
    // This is a simple fallback for testing
    app = { options: firebaseConfig };
  }
} else {
  console.error('Firebase config is incomplete. Missing required values.');
  console.log('Config values:', firebaseConfig);
  // Create a placeholder for testing when config is missing
  app = { options: firebaseConfig };
}

// Check if Firebase was properly initialized by checking the app object structure
const isFirebaseInitialized = app && app.options === undefined;

console.log('Firebase app object:', app);
console.log('Is Firebase properly initialized:', isFirebaseInitialized);

// Initialize Firebase Authentication and get a reference to the service
export const auth = isFirebaseInitialized ? getAuth(app) : null;

// Initialize Firestore
export const db = isFirebaseInitialized ? getFirestore(app) : null;

// Initialize Google Auth Provider only if Firebase is properly initialized
export let googleProvider: GoogleAuthProvider | undefined;
if (isFirebaseInitialized) {
  try {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    console.log('Google Auth Provider created successfully');
  } catch (error) {
    console.error('Error creating Google Auth Provider:', error);
    googleProvider = undefined;
  }
} else {
  console.warn('Firebase not initialized, Google Auth Provider not created');
  googleProvider = undefined;
}

export default app;
