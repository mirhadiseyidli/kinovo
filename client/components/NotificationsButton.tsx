import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

const NotificationsButton: React.FC<{ count: number }> = ({ count }) => {
  return (
    <TouchableOpacity className="relative">
      {/* Notification Bell Icon */}
      <View className="w-9 h-9 justify-center items-center">
        <Feather name="bell" size={24} color="black" />
      </View>

      {/* Badge */}
      {count > 0 && (
        <View className="absolute top-1 right-1 bg-red-500 w-5 h-5 rounded-full justify-center items-center">
          <Text className="text-white text-xs font-bold">{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default NotificationsButton;