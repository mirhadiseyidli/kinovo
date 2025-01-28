import React from 'react';
import { View, Text, Image } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

interface FriendProps {
  name: string;
  image: any;
  eventCount: number;
}

const Friend: React.FC<FriendProps> = ({ name, image, eventCount }) => {
  return (
    <ThemedView className="items-center mx-2">
      {/* Friend Image with Event Count Badge */}
      <ThemedView className="relative">
        <Image
          source={image}
          className={`w-16 h-16 rounded-full ${
            eventCount > 0 ? 'border-2 border-green-500' : ''
          }`}
          resizeMode="cover"
        />
        {eventCount > 0 && (
          <View className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full items-center justify-center">
            <Text className="text-white text-xs font-bold">{eventCount}</Text>
          </View>
        )}
      </ThemedView>

      {/* Friend Name */}
      <ThemedText className="text-sm text-gray-800 mt-2">{name}</ThemedText>
    </ThemedView>
  );
};

export default Friend;