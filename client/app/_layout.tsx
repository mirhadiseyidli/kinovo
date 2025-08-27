import AuthProvider, { useAuthSession } from "@/components/Auth/AuthProvider";
import { Slot, useRouter } from "expo-router";
import { ReactNode, useState, useEffect, useCallback, useRef } from "react";
import { View } from "react-native";
// import * as SplashScreen from "expo-splash-screen";
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import KinovoSplash from "@/components/KinovoSplash";
import 'react-native-reanimated';
import { registerRootComponent } from 'expo';
import { Provider } from 'react-redux';
import { ThemedView } from "@/components/ThemedView";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UserPresence } from "@/components/UserPresence";
import { initializeAppCheckIfNeeded } from "@/config/firebase";
import { useAutomaticCacheManagement } from "@/hooks/useImageCache";
import Animated from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { BannerProvider } from '@/context/BannerContext';
import { QueryClientProvider } from '@tanstack/react-query';
// Simplified TanStack Query setup - legacy DevTools and persistence removed
import { queryClient } from '@/utils/queryClient';
import { Host } from 'react-native-portalize';
import '@/utils/polyfills';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

registerRootComponent(RootLayout);

export default function RootLayout(): ReactNode {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'transparent' }}>
            <KeyboardProvider statusBarTranslucent={false}>
              <Host>
                <InnerLayout />
              </Host>
            </KeyboardProvider>
          </GestureHandlerRootView>
      </QueryClientProvider>
    </AuthProvider>
  );
}

function InnerLayout() {
  const { isLoading, accessToken } = useAuthSession();
  const [appIsReady, setAppIsReady] = useState(false);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);
  // Notification system state removed - simplified initialization
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  
  // Initialize automatic image cache management
  useAutomaticCacheManagement();

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        await initializeAppCheckIfNeeded();
        setIsFirebaseInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        // Don't block app loading on Firebase error
        setIsFirebaseInitialized(true);
      }
    };
    
    initializeFirebase();
  }, []);

  // Notification initialization simplified - handled in UserPresence component

  // TanStack Query is now initialized with the simplified queryClient
  // No additional setup required - persistence and DevTools removed

  useEffect(() => {
    async function prepare() {
      try {

        // Delay splash screen fade out
        setTimeout(() => {
          setIsLogoLoaded(true);
        }, 1500);
      } catch (e) {
        console.warn(e);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (isLogoLoaded) {
      setIsFadingOut(true);
      // Set app ready after animation duration
      setTimeout(() => {
        setAppIsReady(true);
      }, 800);
    }
  }, [isLogoLoaded]);

  const innerContent = !appIsReady ? (
    <ThemedView
      style={{
        flex: 1,
        backgroundColor: themeColors.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Animated.View 
        style={{
          opacity: isFadingOut ? 0 : 1,
          width: "100%",
          height: "100%",
          transitionProperty: ['opacity'],
          transitionDuration: '800ms',
          transitionTimingFunction: 'ease-out',
        }}
      >
        <KinovoSplash />
      </Animated.View>
    </ThemedView>
  ) : (
    <ThemedView style={{ flex: 1 }}>
        {/* Only show UserPresence when Firebase is initialized */}
        {!isLoading && accessToken?.current && isFirebaseInitialized && <UserPresence />}
        <Slot />
    </ThemedView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {innerContent}
    </View>
  );
}