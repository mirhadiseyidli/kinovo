import React from 'react';
import { StatusBar } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import CityPage from '@/components/Explore/CityPage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function City() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={{ flex: 1 }}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <CityPage />
    </ThemedView>
  );
} 