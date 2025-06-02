import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { ExpoConfig, ConfigContext } from '@expo/config';

const plistPath = './GoogleService-Info.plist';

function ensurePlistFileExists() {
  if (process.env.GOOGLE_SERVICES_PLIST && !fs.existsSync(plistPath)) {
    try {
      const decoded = Buffer.from(process.env.GOOGLE_SERVICES_PLIST, 'base64').toString('utf8');
      fs.mkdirSync(path.dirname(plistPath), { recursive: true });
      fs.writeFileSync(plistPath, decoded);
      console.log('✅ GoogleService-Info.plist written from secret');
    } catch (err) {
      console.error('❌ Failed to write plist file from secret:', err);
    }
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  ensurePlistFileExists();

  return {
    name: 'Kinovo',
    slug: 'eventsapp',
    scheme: 'kinovo',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/ios-icon-tinted.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      icon: {
        light: './assets/ios-icon-light.png',
        dark: './assets/ios-icon-dark.png',
        tinted: './assets/ios-icon-tinted.png',
      },
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API!,
        usesNonExemptEncryption: false,
      },
      bundleIdentifier: 'com.kinovoapp.kinovo',
      googleServicesFile: plistPath,
      infoPlist: {
        UIApplicationSupportsIndirectInputEvents: false,
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME!,
              process.env.EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID!,
            ],
          },
        ],
        NSPhotoLibraryUsageDescription: 'Allow this app to access your photo library.',
        NSCameraUsageDescription: 'Allow this app to access your camera.',
        NSLocationWhenInUseUsageDescription:
          'This app needs access to your location for better event suggestions.',
        NSLocationAlwaysUsageDescription: 'We use your location to improve recommendations.',
        NSContactsUsageDescription:
          'Allow this app to access your contacts to help connect with your friends.',
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['remote-notification'],
        FirebaseAppDelegateProxyEnabled: true,
      },
      entitlements: {
        'aps-environment': 'production',
        'com.apple.developer.push-notifications': true,
        'UIBackgroundModes': ['remote-notification'],
        'com.apple.developer.in-app-payments': [], // for Apple Pay
        'com.apple.developer.weatherkit': true,
        'com.apple.developer.usernotifications.time-sensitive': true,
        'com.apple.developer.applesignin': ['Default'], // Sign in with Apple
      }
    },
    web: {
      bundler: 'metro',
    },
    extra: {
      eas: {
        projectId: '430a9e40-9bda-4cc6-954a-625e4926da47',
      },
    },
    owner: 'mirhadiseyidli',
    experiments: {
      typedRoutes: true,
    },
    plugins: [
      'expo-router',
      'expo-maps',
      'expo-secure-store',
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            entitlements: {
              'aps-environment': 'production',
              'com.apple.developer.push-notifications': true,
              'UIBackgroundModes': ['remote-notification'],
              'com.apple.developer.in-app-payments': [], // for Apple Pay
              'com.apple.developer.weatherkit': true,
              'com.apple.developer.usernotifications.time-sensitive': true,
              'com.apple.developer.applesignin': ['Default'], // Sign in with Apple
            },
          },
        },
      ],
    ],
    updates: {
      url: 'https://u.expo.dev/430a9e40-9bda-4cc6-954a-625e4926da47',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  };
};