import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { ThemedView } from '@/components/ThemedView';
import HomeScreenV2 from '@/components/Home/HomeScreen.v2';
import { HomeErrorProvider } from '@/context/HomeErrorContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Href } from 'expo-router';

export default React.memo(function Home() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { redirect } = useLocalSearchParams();

  // Handle redirect from shared links
  useEffect(() => {
    if (redirect && typeof redirect === 'string') {
      // Small delay to ensure the tab is fully loaded
      setTimeout(() => {
        router.push(redirect as Href);
      }, 100);
    }
  }, [redirect, router]);

  return (
    <HomeErrorProvider>
      <ThemedView
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        />
          <HomeScreenV2 />
      </ThemedView>
    </HomeErrorProvider>
  );
});
