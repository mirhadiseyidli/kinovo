import { initializeApp, getApps } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  clientId: process.env.EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID || '',
};

// Initialize Firebase if it hasn't been initialized yet
if (!getApps().length) {
  console.log('Initializing Firebase with config:', {
    ...firebaseConfig,
    apiKey: '***', // Hide sensitive data in logs
    clientId: '***',
  });
  initializeApp(firebaseConfig);
}

// Initialize Auth
const auth = getAuth();

// Configure phone auth settings
const configurePhoneAuth = async () => {
  if (__DEV__) {
    // In development, allow test phone numbers
    auth.settings.appVerificationDisabledForTesting = false;
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