import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../../../hooks/useColorScheme';
import HomeScreen from '../../../components/Home/HomeScreen';
import { ThemedView } from '@/components/ThemedView';
import HomeScreenV2 from '@/components/Home/HomeScreen.v2';

export default React.memo(function Home() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  return (
    <ThemedView
      style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
        {/* <HomeScreen /> */}
        <HomeScreenV2 />
    </ThemedView>
  );
});
