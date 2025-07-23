import { StyleSheet, Image, StatusBar } from 'react-native';
import { ThemedView } from '@/components/ThemedView'
// import DiscoverScreen from '@/components/Explore/Discover';
import DiscoverScreenV2 from '@/components/Explore/Discover.v2';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../../../hooks/useColorScheme';
import React from 'react';
import { DiscoverErrorProvider } from '@/context/DiscoverErrorContext';

export default React.memo(function Explore() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  return (
    <DiscoverErrorProvider>
      <ThemedView
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom}}
      >
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        />
          <DiscoverScreenV2 />
      </ThemedView>
    </DiscoverErrorProvider>
  );
});
