import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const NotificationsButton: React.FC<{ count: number }> = ({ count }) => {
  const colorScheme = useColorScheme();
  
  return (
    <TouchableOpacity className="relative">
      {/* Notification Bell Icon */}
      <ThemedView className="w-9 h-9 justify-center items-center">
        <Feather name="bell" size={28} color={Colors[colorScheme ?? 'dark'].tint} />
      </ThemedView>

      {/* Badge */}
      {count > 0 && (
        <View className="absolute top-[0.1] right-[0.1] bg-red-500 w-4 h-4 rounded-full justify-center items-center">
          <Text className="text-white text-xs font-bold">{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default NotificationsButton;