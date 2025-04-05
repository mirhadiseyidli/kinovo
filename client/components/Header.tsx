import React from 'react';
import { View, Text } from 'react-native';
import NotificationsButton from '@/components/NotificationsButton';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { AutoSkeletonView } from 'react-native-auto-skeleton';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const Header: React.FC<{ refreshing: boolean }> = ({ refreshing }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ThemedView 
      style={{
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 64,
      }}
    >
      {/* Left */}
      <AutoSkeletonView 
        isLoading={refreshing} 
        shimmerBackgroundColor={themeColors.background} 
        gradientColors={[
          themeColors.background, 
          themeColors.inputBackgroundColor
        ]}
      >
        <ThemedText style={{ fontSize: 32, fontFamily: 'Helvetica Neue Bold', fontWeight: 'bold', letterSpacing: -1 }}>Kinovo</ThemedText>
      </AutoSkeletonView>

      {/* Right - Notifications Button */}
      <ThemedView style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <NotificationsButton refreshing={refreshing} count={3} />
      </ThemedView>
    </ThemedView>
  );
};

export default Header;