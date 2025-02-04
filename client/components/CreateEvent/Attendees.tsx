import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import Friend from '@/components/Friend';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const initialAttendees = [
  { id: 1, name: 'John Doe', image: require('@/assets/profile-pic-1.webp') },
  { id: 2, name: 'Jane Smith', image: require('@/assets/profile-pic-2.jpeg') },
  { id: 3, name: 'Sam Wilson', image: require('@/assets/profile-pic-2.jpeg') },
  { id: 4, name: 'Emily Brown', image: require('@/assets/profile-pic-1.webp') },
  { id: 5, name: 'Chris Evans', image: require('@/assets/profile-pic-2.jpeg') },
  { id: 6, name: 'John Doe', image: require('@/assets/profile-pic-1.webp') },
  { id: 7, name: 'Jane Smith', image: require('@/assets/profile-pic-2.jpeg') },
  { id: 8, name: 'Sam Wilson', image: require('@/assets/profile-pic-2.jpeg') },
  { id: 9, name: 'Emily Brown', image: require('@/assets/profile-pic-1.webp') },
  { id: 10, name: 'Chris Evans', image: require('@/assets/profile-pic-2.jpeg') },
];

const Attendees: React.FC = () => {
  const [attendees, setAttendees] = useState(initialAttendees);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const placeholder = "Add People";

  const screenWidth = Dimensions.get('window').width;
  const maxVisibleFriends = Math.floor(screenWidth / 90); // Estimate based on circle + margin (50px + 6px)

  // Remove attendee by ID
  const handleRemove = (id: number) => {
    setAttendees((prev) => prev.filter((friend) => friend.id !== id));
  };

  return (
    <ThemedView style={{ marginBottom: 24 }}>
      {/* Input Field with Icon */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          marginBottom: 16,
          height: screenWidth / 10
        }}
      >
        <Feather name="user-plus" size={18} color={themeColors.placeholderTextColor} style={{ marginRight: 10 }} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholderTextColor}
          style={{
            flex: 1,
            fontSize: 14,
          }}
        />
      </View>

      {/* Attendees List */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {attendees.slice(0, maxVisibleFriends - 1).map((friend) => (
          <View style={{ position: 'relative', marginRight: 8 }} key={friend.id}>
            {/* Friend Circle */}
            <Friend name={friend.name} image={friend.image} size={40} />

            {/* Remove Button (Small "X") */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: 'red',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => handleRemove(friend.id)}
            >
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Show "+X" for remaining attendees */}
        {attendees.length > maxVisibleFriends && (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: themeColors.inputBackgroundColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText style={{ fontSize: 14, fontWeight: 'bold' }}>
              +{attendees.length - (maxVisibleFriends - 1)}
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
};

export default Attendees;