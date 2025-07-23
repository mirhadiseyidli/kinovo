import React from 'react';
import { StatusBar, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
// import CityPage from '@/components/Explore/CityPage';
import CityPageV2 from '@/components/Explore/CityPage.v2';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';

/**
 * TanStack React Query version of City page with InfiniteEventsList
 * 
 * Key improvements over the legacy version:
 * - Uses InfiniteEventsList component for consistent infinite scroll UX
 * - Automatic background refetching and cache management
 * - Better error handling with retry logic and cached data support
 * - Simplified state management (no manual useState or pagination)
 * - Built-in loading states and optimistic updates
 * - Cleaner code with fewer side effects
 * - Infinite scroll for cities with many events
 * - Consistent infinite scroll experience across the app
 * 
 * Migration changes:
 * - Replaced CityPage with CityPage.v2
 * - Uses eventType: 'city' for proper API routing
 * - Infinite scroll handling through InfiniteEventsList
 * - Removed manual state management and loading logic
 * - Better error handling with cached data support
 * - Smooth UI transitions and consistent loading states
 */

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
      {/* <CityPage /> */}
      <CityPageV2 />
    </ThemedView>
  );
}

/**
 * Migration Summary:
 * 
 * CHANGED:
 * - CityPage → CityPageV2 for TanStack Query integration
 * - Added detailed component documentation
 * - Preserved all existing functionality (navigation, styling)
 * 
 * PRESERVED (Unchanged):
 * - Navigation logic and Stack screen configuration
 * - Header design with back button and create event button
 * - All color scheme and theming
 * - Create event navigation logic
 * 
 * BENEFITS:
 * - Better performance with infinite scroll for large city lists
 * - Automatic cache management and background refetching
 * - Consistent UX with other infinite scroll lists in the app
 * - Built-in error handling and retry functionality
 * - Simplified state management in CityPageV2
 * - Memory efficient infinite scroll
 * - Type safety improvements
 */ 