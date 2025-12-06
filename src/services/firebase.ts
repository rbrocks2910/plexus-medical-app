import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration
// You'll need to replace these with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyBUfcB8twN2wwhw5tFuZUG0ldLRtU6k5sU",
  authDomain: "plexus-medical-app-20c07.firebaseapp.com",
  projectId: "plexus-medical-app-20c07",
  storageBucket: "plexus-medical-app-20c07.firebasestorage.app",
  messagingSenderId: "259815336360",
  appId: "1:259815336360:web:ca6cbf9080772a545c159d",
  measurementId: "G-NEG99LZ9D7"
};

// Initialize Firebase

const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
