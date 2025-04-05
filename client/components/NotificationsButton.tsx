import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AutoSkeletonView } from 'react-native-auto-skeleton';

const NotificationsButton: React.FC<{ refreshing: boolean; count: number }> = ({ refreshing, count }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity style={{ position: 'relative' }}>
      {/* Notification Bell Icon */}
      <AutoSkeletonView 
        isLoading={refreshing} 
        shimmerBackgroundColor={themeColors.background} 
        gradientColors={[
          themeColors.background, 
          themeColors.inputBackgroundColor
        ]}
      >
        <ThemedView
          style={{
            width: 36,
            height: 36,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Feather name="bell" size={28} color={themeColors.tint} />
        </ThemedView>

        {/* Badge */}
        {count > 0 && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              backgroundColor: 'red',
              width: 16,
              height: 16,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
              {count}
            </Text>
          </View>
        )}
      </AutoSkeletonView>
    </TouchableOpacity>
  );
};

export default NotificationsButton;