import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Friend from '@/components/Home/Friend';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';

const friendData = [
  { id: 1, name: 'Emma', image: require('@/assets/profile-pic-1.webp'), eventCount: 3 },
  { id: 2, name: 'Mike', image: require('@/assets/profile-pic-2.jpeg'), eventCount: 1 },
  { id: 3, name: 'Lisa', image: require('@/assets/profile-pic-1.webp'), eventCount: 0 },
  { id: 4, name: 'Alex', image: require('@/assets/profile-pic-2.jpeg'), eventCount: 0 },
  { id: 5, name: 'Emma', image: require('@/assets/profile-pic-1.webp'), eventCount: 3 },
  { id: 6, name: 'Mike', image: require('@/assets/profile-pic-2.jpeg'), eventCount: 1 },
  { id: 7, name: 'Lisa', image: require('@/assets/profile-pic-1.webp'), eventCount: 0 },
  { id: 8, name: 'Alex', image: require('@/assets/profile-pic-2.jpeg'), eventCount: 0 },
];

const SeeWhatFriendsAreUpTo: React.FC = () => {
  const colorScheme = useColorScheme();

  return (
    <ThemedView className="pl-4 pb-4">
      {/* Header */}
      <ThemedView className="flex-row justify-between items-center mb-4">
        <ThemedText className="text-md font-bold text-gray-800">Friends' Events</ThemedText>
        <TouchableOpacity className='flex-row items-center pr-4'>
          <ThemedText className="text-md text-green-500 mr-1">See All</ThemedText>
          <IconSymbol
            name="chevron.right"
            size={12}
            color={Colors[colorScheme ?? 'dark'].tint}
          />
        </TouchableOpacity>
      </ThemedView>

      {/* Friends List */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {friendData.map((friend) => (
          <Friend
            key={friend.id}
            name={friend.name}
            image={friend.image}
            eventCount={friend.eventCount}
          />
        ))}
      </ScrollView>
    </ThemedView>
  );
};

export default SeeWhatFriendsAreUpTo;