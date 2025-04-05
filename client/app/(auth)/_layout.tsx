import { useAuthSession } from "@/components/Auth/AuthProvider";
import { Redirect, Stack } from 'expo-router';
import { Text } from 'react-native';
import { ReactNode } from "react";
import { LocationProvider } from '@/context/LocationContext'; // ✅ Import LocationProvider
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { EventCreatedMessageProvider } from "@/context/EventCreatedMessageContext";

export default function RootLayout(): ReactNode {
  const { accessToken, isLoading } = useAuthSession();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (!accessToken?.current) {
    return <Redirect href="/login" />;
  }

  return (
    <LocationProvider>
      <EventCreatedMessageProvider>
        <Stack
          screenOptions={{
            headerShown: false
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen 
            name="(createEvent)"
            options={{ 
              title: 'Create Event',
              presentation: 'modal', 
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
              headerStyle: { 
                backgroundColor: themeColors.background
              },
              headerTintColor: themeColors.text,
              headerTitleStyle: {
                fontWeight: 'bold'
              }
            }}
          />
        </Stack>
      </EventCreatedMessageProvider>
    </LocationProvider>
  );
}