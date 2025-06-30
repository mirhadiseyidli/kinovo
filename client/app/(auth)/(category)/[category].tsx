import React from 'react';
import { StatusBar, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import CategoryPage from '@/components/Explore/CategoryPage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Category() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { category } = useLocalSearchParams();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

  const handleCreateEvent = async () => {
    // Store the current category in AsyncStorage
    if (category) {
      try {
        await AsyncStorage.setItem('selectedCategory', category as string);
        console.log('Set category in AsyncStorage:', category);
      } catch (error) {
        console.error('Error setting category in AsyncStorage:', error);
      }
    }
    
    // Navigate to create event screen
    router.push('/(auth)/(createEvent)/EventDetails');
  };

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
          headerTitle: category as string,
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
              onPress={handleCreateEvent}
            >
              <Feather name="plus-circle" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      <CategoryPage />
    </ThemedView>
  );
} 