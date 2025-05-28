import React from 'react';
import { StatusBar } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import CategoryPage from '@/components/Explore/CategoryPage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Category() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={{ flex: 1, paddingTop: insets.top }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <CategoryPage />
    </ThemedView>
  );
} 