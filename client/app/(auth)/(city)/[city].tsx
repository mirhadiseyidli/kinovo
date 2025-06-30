import React from 'react';
import { StatusBar, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import CityPage from '@/components/Explore/CityPage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';

export default function City() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { city } = useLocalSearchParams();
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
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          headerTitle: city as string,
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={goBack}
            >
              <Feather name="chevron-left" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/(auth)/(createEvent)/EventDetails')}
            >
              <Feather name="plus-circle" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <CityPage />
    </ThemedView>
  );
} 