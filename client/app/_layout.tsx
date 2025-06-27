import AuthProvider, { useAuthSession } from "@/components/Auth/AuthProvider";
import { Slot, useRouter } from "expo-router";
import { ReactNode, useState, useEffect, useCallback } from "react";
import { View, Linking } from "react-native";
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
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
// Import background notification handler to register it
import '@/utils/backgroundNotificationHandler';
import * as Notifications from 'expo-notifications';

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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <InnerLayout />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}

function InnerLayout() {
  const { isLoading, accessToken } = useAuthSession();
  const [appIsReady, setAppIsReady] = useState(false);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const logoFadeAnim = useSharedValue(1);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  
  // Initialize automatic image cache management
  useAutomaticCacheManagement();

  // Handle deep links
  const handleDeepLink = useCallback((url: string) => {
    console.log('Deep link received:', url);
    
    if (!accessToken?.current) {
      // User not logged in, store the deep link for later
      console.log('User not authenticated, storing deep link for later');
      return;
    }

    try {
      // Parse the URL
      const urlObj = new URL(url);
      const scheme = urlObj.protocol.replace(':', '');
      const path = urlObj.pathname;

      if (scheme === 'kinovo') {
        const pathSegments = path.split('/').filter(Boolean);
        
        if (pathSegments.length >= 2) {
          const [type, id] = pathSegments;
          
          if (type === 'event') {
            console.log('Navigating to event:', id);
            router.push(`/(auth)/(viewEvent)/${id}`);
          } else if (type === 'profile') {
            console.log('Navigating to profile:', id);
            router.push(`/(auth)/(profile)/${id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing deep link:', error);
    }
  }, [accessToken, router]);

  // Set up deep link listeners
  useEffect(() => {
    // Handle app opened via deep link when app was closed
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('App opened with initial URL:', initialUrl);
        // Wait for authentication to complete
        setTimeout(() => {
          handleDeepLink(initialUrl);
        }, 2000);
      }
    };

    // Handle app opened via deep link when app was in background
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('App opened with URL:', event.url);
      handleDeepLink(event.url);
    });

    getInitialURL();

    return () => {
      subscription?.remove();
    };
  }, [handleDeepLink]);

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        await initializeAppCheckIfNeeded();
        setIsFirebaseInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
      }
    };
    
    initializeFirebase();
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // await SplashScreen.preventAutoHideAsync();

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

  return !appIsReady ? (
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
        {/* Only show UserPresence when Firebase is initialized */}
        {!isLoading && accessToken?.current && isFirebaseInitialized && <UserPresence />}
        <Slot />
    </ThemedView>
  );
}