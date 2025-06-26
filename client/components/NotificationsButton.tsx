import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

const NotificationsButton: React.FC<{ refreshing?: boolean; count: number }> = React.memo(({ refreshing, count }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

  return (
    <TouchableOpacity 
      style={{ position: 'relative' }}
      onPress={() => router.push('/(auth)/(notifications)/notifications')}
    >
      {/* Notification Bell Icon */}
      <View
        style={{
          width: 30,
          height: 30,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Feather name="bell" size={24} color={themeColors.tint} />
      </View>

      {/* Badge */}
      {count > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 1,
            right: 4,
            backgroundColor: 'red',
            width: 14,
            height: 14,
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
});

NotificationsButton.displayName = 'NotificationsButton';

export default NotificationsButton;