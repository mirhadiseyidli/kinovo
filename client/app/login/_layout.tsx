import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LoginLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

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
        headerShown: false,
        headerStyle: {
          backgroundColor: themeColors.background,
        },
        headerTintColor: themeColors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="signUp"
        options={{
          headerTitle: 'Create Account',
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={goBack}
            >
              <Feather name="chevron-left" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
} 