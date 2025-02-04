import { StyleSheet, Image, StatusBar } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import DiscoverScreen from '@/components/Explore/Discover';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../../hooks/useColorScheme';
import CreateEvent from '@/components/CreateEvent/CreateEvent';

export default function Create() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  return (
    <ThemedView
      style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom}}
    >
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
        <CreateEvent />
    </ThemedView>
  );
}
