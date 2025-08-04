import { useAuthSession } from "@/components/Auth/AuthProvider";
import { Redirect, Stack, useRouter } from 'expo-router';
import { ReactNode, useMemo } from "react";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { UserSessionProvider } from '@/context/UserSessionContext';
import { TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";

export default function RootLayout(): ReactNode {
  const { accessToken, isLoading } = useAuthSession();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

  // goBack function - MUST be before any conditional returns due to useMemo dependency
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const headerLeftButton = useMemo(() => (
    <TouchableOpacity 
      onPress={goBack}
    >
      <Feather name="chevron-left" size={24} color={themeColors.text} />
    </TouchableOpacity>
  ), [themeColors.text]);

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
          name="viewEvent/[event_id]"
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
        />
        <Stack.Screen 
          name="profile/[_id]"
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
        <Stack.Screen
          name="attention-required.v2"
          options={{
            headerTitle: 'Attention Required',
            headerTintColor: themeColors.text,
            headerStyle: {
              backgroundColor: themeColors.background,
            },
            headerShadowVisible: false,
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
            headerLeft: () => headerLeftButton,
          }}
        />
        <Stack.Screen
          name="friends-events-infinite"
          options={{
            headerTitle: 'Friends\' Events',
            headerTintColor: themeColors.text,
            headerStyle: {
              backgroundColor: themeColors.background,
            },
            headerShadowVisible: false,
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
            headerLeft: () => headerLeftButton
          }}
        />
      </Stack>
    </UserSessionProvider>
  );
}