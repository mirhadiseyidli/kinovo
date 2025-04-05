import { StyleSheet, Image, StatusBar, Text } from 'react-native';
import { ThemedView } from '@/components/ThemedView'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../../hooks/useColorScheme';
import React from 'react';

export default React.memo(function DayView() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  return (
    <ThemedView
      style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom}}
    >
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
        <Text>Hello</Text>
    </ThemedView>
  );
});
