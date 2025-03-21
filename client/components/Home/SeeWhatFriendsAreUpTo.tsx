import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Friend from '@/components/Friend';
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
  const screenWidth = Dimensions.get('window').width;

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <ThemedView
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Friends' Events</ThemedText>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 16, marginRight: 4 }}>See All</ThemedText>
          <IconSymbol name="chevron.right" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
        </TouchableOpacity>
      </ThemedView>

      {/* Friends List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ width: screenWidth }}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: screenWidth * 0.04 }}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {friendData.map((friend) => (
            <Friend key={friend.id} name={friend.name} image={friend.image} eventCount={friend.eventCount} showName={true} />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
};

export default SeeWhatFriendsAreUpTo;