import { useAuthSession } from "@/components/Auth/AuthProvider";
import { Redirect, router, Stack, useNavigation } from 'expo-router';
import { Alert, Linking, Text, TouchableOpacity } from 'react-native';
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useLocalSearchParams } from "expo-router";
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { UserSessionProvider } from '@/context/UserSessionContext';

export default function RootLayout(): ReactNode {
  const { accessToken, isLoading } = useAuthSession();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // Shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureActive = useSharedValue(0);

  // Store pending deep link
  const pendingDeepLink = useRef<string | null>(null);
  const deepLinkRetryCount = useRef(0);
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 1000;

  // Process deep link with retries
  const processDeepLink = useCallback((url: string) => {
    console.log('Processing deep link:', url);
    
    try {
      // Parse the URL
      const urlObj = new URL(url);
      const scheme = urlObj.protocol.replace(':', '');

      console.log('Deep link scheme:', scheme);

      // Handle both custom scheme and universal links
      if (scheme === 'kinovo' || scheme === 'https' || scheme === 'http') {
        const edited_path = urlObj.href.replace(/^.*?:\/\//, ''); // Remove 'kinovo://'
        const pathSegments = edited_path.split('/').filter(Boolean);
        console.log('Path segments:', pathSegments);
        
        if (pathSegments.length >= 2) {
          let type, id;
          
          if (scheme === 'kinovo') {
            [type, id] = pathSegments;
          } else {
            // For universal links, the path might be different
            // Example: kinovo.app/event/123 or kinovo.app/profile/123
            type = pathSegments[0];
            id = pathSegments[1];
          }
          
          console.log('Link type:', type);
          console.log('Link ID:', id);
          
          if (type === 'event' || type === 'events') {
            console.log('Navigating to event:', id);
            router.push(`/(auth)/(viewEvent)/${id}`);
            return true;
          } else if (type === 'profile' || type === 'profiles') {
            router.push({
              pathname: "/(auth)/(profile)/[_id]" as const,
              params: { _id: id }
            });
            return true;
          }
        }
      }
    } catch (error) {
      console.error('Error processing deep link:', error);
    }
    return false;
  }, [router]);

  // Handle deep link with auth check and retries
  const handleDeepLink = useCallback((url: string) => {
    console.log('Deep link received:', url);
    
    if (isLoading || !accessToken?.current) {
      console.log('Auth not ready, storing deep link for later');
      pendingDeepLink.current = url;
      return;
    }

    const success = processDeepLink(url);
    if (!success && deepLinkRetryCount.current < MAX_RETRIES) {
      console.log(`Deep link processing failed, scheduling retry ${deepLinkRetryCount.current + 1}/${MAX_RETRIES}`);
      setTimeout(() => {
        deepLinkRetryCount.current++;
        handleDeepLink(url);
      }, RETRY_DELAY);
    }
  }, [isLoading, processDeepLink, accessToken?.current]);

  // Process pending deep link when auth becomes ready
  useEffect(() => {
    if (!isLoading && pendingDeepLink.current && accessToken?.current) {
      console.log('Auth ready, processing pending deep link');
      const url = pendingDeepLink.current;
      pendingDeepLink.current = null;
      deepLinkRetryCount.current = 0;
      handleDeepLink(url);
    }
  }, [isLoading, handleDeepLink, accessToken?.current]);

  // Set up deep link listeners
  useEffect(() => {
    // Handle app opened via deep link when app was closed
    const getInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('App opened with initial URL:', initialUrl);
          handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('Error getting initial URL:', error);
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

  if (!accessToken?.current) {
    return <Redirect href="/login" />;
  }

  return (
    <UserSessionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="(createEvent)"
          options={{ 
            gestureEnabled: true,
            gestureDirection: 'vertical',
            headerBackVisible: false,
            headerShown: true,
            headerStyle: { 
              backgroundColor: themeColors.background
            },
            headerTintColor: themeColors.text,
            headerTitleStyle: {
              fontWeight: 'bold'
            }
          }}
        />
        <Stack.Screen 
          name="(viewEvent)/[event_id]"
          options={{ 
            title: 'Event Details',
            gestureEnabled: true,
            gestureDirection: 'vertical',
            headerShown: true,
            headerBackVisible: false,
            headerStyle: { 
              backgroundColor: themeColors.background
            },
            headerTintColor: themeColors.text,
            headerTitleStyle: {
              fontWeight: 'bold'
            },
            animationTypeForReplace: 'pop',
          }}
          listeners={{
            blur: () => {
              'worklet';
              translateX.value = 0;
              translateY.value = 0;
              gestureActive.value = 0;
            },
            beforeRemove: () => {
              'worklet';
              translateX.value = 0;
              translateY.value = 0;
              gestureActive.value = 0;
            }
          }}
        />
        <Stack.Screen 
          name="(profile)/[_id]"
          options={{
            headerTitle: 'Profile',
            headerTintColor: themeColors.text,
            headerStyle: {
              backgroundColor: themeColors.background,
            },
            headerShadowVisible: false,
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
          }} 
        />
      </Stack>
    </UserSessionProvider>
  );
}