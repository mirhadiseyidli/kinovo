import { Link, Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Oops! This screen doesn't exist." }} />
      <ThemedView style={styles.container}>
        <Link href="/" style={{ color: 'white' }}>Go to home screen</Link>
      </ThemedView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
