import { useAuthSession } from "@/components/Auth/AuthProvider";
import { Redirect, Stack, useNavigation } from 'expo-router';
import { Text } from 'react-native';
import { ReactNode } from "react";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useLocalSearchParams } from "expo-router";
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { UserSessionProvider } from '@/context/UserSessionContext';

export default function RootLayout(): ReactNode {
  const { accessToken, isLoading } = useAuthSession();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const params = useLocalSearchParams();

  // Shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureActive = useSharedValue(0);


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
          name="(aboutUser)"
          options={{ 
            headerShown: true,
            gestureEnabled: true,
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
      </Stack>
    </UserSessionProvider>
  );
}