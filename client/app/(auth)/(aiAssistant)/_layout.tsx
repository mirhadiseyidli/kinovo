import { useAuthSession } from "@/components/Auth/AuthProvider";
import { Redirect, Stack, useRouter } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import { ReactNode, useCallback, useMemo } from "react";
// Location provider is now part of UserSessionProvider
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';

export default function RootLayout(): ReactNode {
  const { accessToken, isLoading } = useAuthSession();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (!accessToken?.current) {
    return <Redirect href="/login" />;
  }

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  const headerLeftComponent = useMemo(() => (
    <TouchableOpacity onPress={goBack}>
      <Feather name="chevron-left" size={24} color={themeColors.text} />
    </TouchableOpacity>
  ), [goBack, themeColors.text]);

  return (
        <Stack
          screenOptions={{
            title: 'Kinovo AI',
            headerShown: true,
            headerStyle: {
              backgroundColor: themeColors.background
            },
            headerTintColor: themeColors.text,
            headerTitleStyle: {
              fontWeight: 'bold'
            },
            headerLeft: () => headerLeftComponent,
          }}
        >
          <Stack.Screen name="AiAssistant"/>
          <Stack.Screen name="ConversationList" />
        </Stack>
  );
}