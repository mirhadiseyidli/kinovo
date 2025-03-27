import { StyleSheet, Image, StatusBar } from 'react-native';
import { ThemedView } from '@/components/ThemedView'
import DiscoverScreen from '@/components/Explore/Discover';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../../../hooks/useColorScheme';

export default function Explore() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  return (
    <ThemedView
      style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom}}
    >
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
        <DiscoverScreen />
    </ThemedView>
  );
}
