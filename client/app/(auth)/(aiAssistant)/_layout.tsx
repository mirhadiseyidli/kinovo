import { useAuthSession } from "@/components/Auth/AuthProvider";
import { Redirect, Stack, useRouter } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import { ReactNode } from "react";
// Location provider is now part of UserSessionProvider
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from "expo-router";
import { cancelAnimation } from 'react-native-reanimated';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

export default function RootLayout(): ReactNode {
  const { accessToken, isLoading } = useAuthSession();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

  // Declare shared values in a scope accessible to listeners
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (!accessToken?.current) {
    return <Redirect href="/login" />;
  }

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

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
            headerLeft: () => (
              <TouchableOpacity onPress={goBack}>
                <Feather name="chevron-left" size={24} color={themeColors.text} />
              </TouchableOpacity>
            ),
          }}
        >
          <Stack.Screen name="AiAssistant"/>
          <Stack.Screen name="ConversationList" />
        </Stack>
  );
}