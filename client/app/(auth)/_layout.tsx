import { useAuthSession } from "@/components/Auth/AuthProvider";
import { Redirect, Stack } from 'expo-router';
import { Text } from 'react-native';
import { ReactNode } from "react";
import { LocationProvider } from '@/context/LocationContext'; // ✅ Import LocationProvider

export default function RootLayout(): ReactNode {
  const { accessToken, isLoading } = useAuthSession();

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (!accessToken?.current) {
    return <Redirect href="/login" />;
  }

  return (
    <LocationProvider>
      <Stack
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </LocationProvider>
  );
}