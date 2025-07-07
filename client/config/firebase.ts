import { initializeApp, getApps, getApp } from '@react-native-firebase/app';
import { getAuth, FirebaseAuthTypes, signInWithCustomToken } from '@react-native-firebase/auth';
import getAppCheck, { getToken, initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import { getDatabase } from '@react-native-firebase/database';
import messaging from '@react-native-firebase/messaging';
import { jwtDecode } from 'jwt-decode';

// Initialize Firebase if it hasn't been initialized yet
let appInitialized = false;
const firebaseApp = getApps().length ? getApp() : getApp(); // Redundant for clarity

if (getApps().length) {
  appInitialized = true;
}

// Retrieve default app
const db = getDatabase(firebaseApp, process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL);

export const initializeAppCheckIfNeeded = async () => {
  const appCheckProvider = new ReactNativeFirebaseAppCheckProvider();

  appCheckProvider.configure({
    apple: {
      provider: 'deviceCheck',
      ...( __DEV__ ? { debugToken: 'DA12D6B7-B95B-4AE1-AA79-DFF64BB42CC6' } : {}),
    }
  });

  try {
    await initializeAppCheck(getApp(), {
      provider: appCheckProvider,
      isTokenAutoRefreshEnabled: true,
    });

    // ✅ Get the app check instance and pass it to getToken()
    const appCheckInstance = getAppCheck();
    const token = await getToken(appCheckInstance);

  } catch (err) {
    console.error('❌ App Check failed:', err);
  }
};

// Initialize Auth
const auth = getAuth(firebaseApp);

// Configure phone auth settings
const configurePhoneAuth = async () => {
  if (__DEV__) {
    // In development, allow test phone numbers
    auth.settings.appVerificationDisabledForTesting = false;
  } else {
    // In production, use real phone verification
    auth.settings.appVerificationDisabledForTesting = false;
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
    
    return await auth.signInWithPhoneNumber(formattedPhone);
  } catch (error) {
    console.error('Error initiating phone auth:', error);
    throw error;
  }
};

export const signInWithFirebaseToken = async (customToken: string) => {
  await signInWithCustomToken(auth, customToken)
    .then((result) => {
      return result; // You might not need to return here if you handle the result in the .then
    })
    .catch((error) => {
      // This is where you'll see the error!
      console.error('Firebase auth failed:', error);
    });
};

// FCM Functions
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const setupFCMListeners = () => {
  // Listen for token refresh
  const unsubscribeTokenRefresh = messaging().onTokenRefresh(token => {
    // You can save the new token to your server here
  });

  // Handle foreground messages
  const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
    // Handle the message when app is in foreground
  });

  // Return cleanup function
  return () => {
    unsubscribeTokenRefresh();
    unsubscribeForeground();
  };
};

export { auth, configurePhoneAuth, db, messaging }; 