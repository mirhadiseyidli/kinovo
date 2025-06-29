import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { ExpoConfig, ConfigContext } from '@expo/config';

const buildProfile = process.env.EAS_BUILD_PROFILE;

const apsEnv =
  buildProfile === 'development'
    ? 'development'
    : buildProfile === 'preview'
    ? 'production' // or 'production' depending on your goal for preview
    : 'production';

const plistPath = './GoogleService-Info.plist';

export default ({ config }: ConfigContext): ExpoConfig => {

  return {
    name: 'Kinovo',
    slug: 'eventsapp',
    scheme: 'kinovo',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/ios-icon-tinted.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      backgroundColor: '#151718',
      dark: {
        backgroundColor: '#151718',
      },
      light: {
        backgroundColor: '#fff',
      },
    },
    ios: {
      icon: {
        light: './assets/ios-icon-light.png',
        dark: './assets/ios-icon-dark.png',
        tinted: './assets/ios-icon-tinted.png',
      },
      config: {
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
              process.env.EXPO_PUBLIC_FIREBASE_IOS_URL_SCHEME!,
            ],
          },
          {
            CFBundleURLSchemes: [
              'kinovo',
              'com.kinovoapp.kinovo',
            ],
          },
          {
            CFBundleURLSchemes: [
              'exp+eventsapp',
            ]
          },
        ],
        NSPhotoLibraryUsageDescription: 'Allow this app to access your photo library.',
        NSCalendarsUsageDescription: 'Allow Kinovo to access your calendar',
        NSCalendarsFullAccessUsageDescription: 'Allow Kinovo to access your calendar for event syncing',
        NSRemindersUsageDescription: 'Allow Kinovo to access your reminders for event alerts',
        NSRemindersFullAccessUsageDescription: 'Allow Kinovo to access your reminders for event alerts',
        NSLocationWhenInUseUsageDescription:
          'This app needs access to your location for better event suggestions.',
        NSLocationAlwaysUsageDescription: 'We use your location to improve recommendations.',
        NSContactsUsageDescription:
          'Allow this app to access your contacts to help connect with your friends.',
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: [
          'remote-notification',
          'fetch',
          'location',
          'processing'
        ],
        BGTaskSchedulerPermittedIdentifiers: [
          'com.kinovoapp.kinovo.refresh'
        ],
        FirebaseAppDelegateProxyEnabled: true,
        UNNotificationAlertStyle: 'alert',
        NSNotificationAlertSound: 'default', // or a custom sound file name
        NSUserActivityTypes: ['com.kinovoapp.kinovo.event'], // Added for calendar/reminder integration
      },
      entitlements: {
        'aps-environment': apsEnv,
        'com.apple.developer.in-app-payments': [], // for Apple Pay
        'com.apple.developer.weatherkit': true,
        'com.apple.developer.usernotifications.time-sensitive': true,
        'com.apple.developer.applesignin': ['Default'], // Sign in with Apple
      },
      usesAppleSignIn: true,
      associatedDomains: [
        'applinks:kinovo.app',
        'applinks:www.kinovo.app',
        'webcredentials:kinovo.app',
        'webcredentials:www.kinovo.app'
      ],
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
      'react-native-maps',
      'expo-secure-store',
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      '@react-native-firebase/app-check',
      '@react-native-firebase/messaging',
      'expo-notifications',
      'expo-calendar',
      'expo-apple-authentication',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            entitlements: {
              'aps-environment': apsEnv,
              'com.apple.developer.in-app-payments': [], // for Apple Pay
              'com.apple.developer.weatherkit': true,
              'com.apple.developer.usernotifications.time-sensitive': true,
              'com.apple.developer.applesignin': ['Default'], // Sign in with Apple
              'com.apple.developer.associated-domains': [
                'applinks:kinovo.app',
                'applinks:www.kinovo.app',
                'webcredentials:kinovo.app',
                'webcredentials:www.kinovo.app'
              ],
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