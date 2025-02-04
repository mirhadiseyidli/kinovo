import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const NotificationsButton: React.FC<{ count: number }> = ({ count }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity style={{ position: 'relative' }}>
      {/* Notification Bell Icon */}
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
    </TouchableOpacity>
  );
};

export default NotificationsButton;