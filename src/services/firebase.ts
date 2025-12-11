import { initializeApp } from 'firebase/app';
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
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    // Create a placeholder app to prevent other parts of the app from breaking
    // This is a simple fallback for testing
    app = { options: firebaseConfig };
  }
} else {
  console.error('Firebase config is incomplete. Missing required values.');
  // Create a placeholder for testing when config is missing
  app = { options: firebaseConfig };
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = app.options ? null : getAuth(app);

// Initialize Firestore
export const db = app.options ? null : getFirestore(app);

// Initialize Google Auth Provider only if Firebase is properly initialized
export let googleProvider: GoogleAuthProvider | undefined;
if (!app.options) { // Firebase was properly initialized
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
} else {
  console.warn('Firebase not initialized, Google Auth Provider not created');
  googleProvider = undefined;
}

export default app;
