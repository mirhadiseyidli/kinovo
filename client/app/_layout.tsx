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
import { useAutomaticCacheManagement } from "@/hooks/useImageCache";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { BannerProvider } from '@/context/BannerContext';
import { QueryClientProvider } from '@tanstack/react-query';
// ReactQueryDevtools removed - now handled programmatically in devtools setup
import { queryClient, setupOfflineQueue, setupGlobalErrorHandlers } from '@/utils/queryClient';
import { PersistQueryClientProvider, asyncStoragePersister } from '@/utils/persistedQueryClient';
import { initializeDevTools, getDevToolsConfig } from '@/utils/devtools';
import { initializeAppTelemetry } from '@/utils/telemetrySetup';

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
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister }}
        >
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'transparent' }}>
            <KeyboardProvider statusBarTranslucent={false}>
              <InnerLayout />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </PersistQueryClientProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

function InnerLayout() {
  const { isLoading, accessToken } = useAuthSession();
  const [appIsReady, setAppIsReady] = useState(false);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);
  const [isNotificationSystemInitialized, setIsNotificationSystemInitialized] = useState(false);
  const logoFadeAnim = useSharedValue(1);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  
  // Initialize automatic image cache management
  useAutomaticCacheManagement();

  useEffect(() => {
    // APNs initialization is now handled in UserPresence component
    setIsNotificationSystemInitialized(true);
  }, []);

  // Initialize TanStack utilities after auth is ready and notification system is initialized
  useEffect(() => {
    if (isNotificationSystemInitialized && !isLoading) {
      const initializeTanStackUtilities = async () => {
        try {
          // Always initialize core production utilities
          const initializeOfflineQueue = async () => {
            await setupOfflineQueue();
            console.log('Offline queue initialized successfully');
          };
          
          const initializeErrorHandlers = () => {
            setupGlobalErrorHandlers();
            console.log('Error handlers initialized successfully');
          };
          
          const initializeTelemetry = () => {
            if (__DEV__) {
              initializeAppTelemetry(queryClient);
              console.log('Telemetry initialized successfully (development only)');
            }
          };
          
          // Development-only utilities
          const initializeDevToolsSetup = async () => {
            if (__DEV__) {
              await initializeDevTools(queryClient);
              console.log('DevTools initialized successfully (development only)');
            }
          };
          
          // Initialize core utilities first
          await initializeOfflineQueue();
          initializeErrorHandlers();
          initializeTelemetry();
          
          // Initialize development tools last (if in dev mode)
          await initializeDevToolsSetup();
          
        } catch (error) {
          console.error('Failed to initialize TanStack utilities:', error);
        }
      };
      
      initializeTanStackUtilities();
    }
  }, [isNotificationSystemInitialized, isLoading]);

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
      logoFadeAnim.value = withTiming(0, { duration: 800 }, () => {
        runOnJS(setAppIsReady)(true);
      });
    }
  }, [isLogoLoaded]);

  // Memoized animated style
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: logoFadeAnim.value,
    width: "100%",
    height: "100%"
  }), [logoFadeAnim]);

  const innerContent = !appIsReady ? (
    <ThemedView
      style={{
        flex: 1,
        backgroundColor: themeColors.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Animated.View style={animatedStyle}>
        <KinovoSplash />
      </Animated.View>
    </ThemedView>
  ) : (
    <ThemedView style={{ flex: 1 }}>
        {/* Show UserPresence when authenticated */}
        {!isLoading && accessToken?.current && <UserPresence />}
        <Slot />
    </ThemedView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {innerContent}
    </View>
  );
}