import { initializeApp, getApps, getApp } from '@react-native-firebase/app';
import { getAuth, FirebaseAuthTypes } from '@react-native-firebase/auth';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import { getDatabase } from '@react-native-firebase/database';
import { jwtDecode } from 'jwt-decode';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  clientId: process.env.EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID || '',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || '',
};

export const signInWithFirebaseToken = async (customToken: string): Promise<void> => {
  try {
    const result = await auth.signInWithCustomToken(customToken);
    console.log('result', result);
    console.log('Firebase authentication successful with custom token');
  } catch (error) {
    console.error('Error signing in with custom token:', error);
    throw error;
  }
};

// Initialize Firebase if it hasn't been initialized yet
if (!getApps().length) {
  console.log('Initializing Firebase with config (redacted)');
  initializeApp(firebaseConfig);
}

// Retrieve default app
const firebaseApp = getApp();
const db = getDatabase(firebaseApp);

// Initialize App Check once, on initial load
let appCheckInitialized = false;

if (!appCheckInitialized) {
  const appCheckProvider = new ReactNativeFirebaseAppCheckProvider();
  appCheckProvider.configure({
    android: { provider: __DEV__ ? 'debug' : 'playIntegrity' },
    apple: { provider: __DEV__ ? 'debug' : 'deviceCheck' },
  });

  initializeAppCheck(firebaseApp, {
    provider: appCheckProvider,
    isTokenAutoRefreshEnabled: true,
  });

  console.log('App Check initialized');
  appCheckInitialized = true;
}

// Initialize Realtime Database settings using modular API
export const initializeFirebaseDatabase = () => {
  db.setPersistenceEnabled(true);
  db.setPersistenceCacheSizeBytes(10 * 1024 * 1024);
  console.log('Firebase Realtime Database initialized with persistence');
};

// Initialize Auth
const auth = getAuth(firebaseApp);

// Configure phone auth settings
const configurePhoneAuth = async () => {
  if (__DEV__) {
    // In development, allow test phone numbers
    auth.settings.appVerificationDisabledForTesting = true;
    console.log('Development mode: test phone numbers enabled');
  } else {
    // In production, use real phone verification
    auth.settings.appVerificationDisabledForTesting = false;
    console.log('Production mode: using real phone verification');
  }
};

// Initialize phone auth configuration
configurePhoneAuth();

// Export the auth instance
export const firebaseAuth = auth;

// Export a function to handle phone authentication
export const initiatePhoneAuth = async (phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
  try {
    // Make sure the phone number is in E.164 format
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    console.log('Initiating phone auth for:', formattedPhone);
    
    // Log Firebase initialization status
    console.log('Firebase apps:', getApps().length);
    console.log('Auth configured:', !!auth);
    
    return await auth.signInWithPhoneNumber(formattedPhone);
  } catch (error) {
    console.error('Error initiating phone auth:', error);
    throw error;
  }
};

export { auth, configurePhoneAuth, db }; 