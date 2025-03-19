import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, Dimensions, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import Friend from '@/components/Friend';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Friend {
  id: number;
  name: string;
  image?: any;
}

const Attendees: React.FC = () => {
  const [attendees, setAttendees] = useState<Friend[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Friend[]>([]);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const placeholder = "Add People";

  const screenWidth = Dimensions.get('window').width;
  const maxVisibleFriends = Math.floor(screenWidth / 90); // Estimate based on circle + margin (50px + 6px)

  const getFriend = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) throw new Error('No access token');

      const emailSearch = axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/me/friends/email?query=${query}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
      });

      const nameSearch = axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/me/friends/name?query=${query}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
      });

      const [emailResults, nameResults] = await Promise.all([emailSearch, nameSearch]);

      const combinedResults = [...emailResults.data, ...nameResults.data];
      const uniqueResults: Friend[] = Array.from(new Map(combinedResults.map((item: Friend) => [item.name.toLowerCase(), item])).values());

      setSuggestions(uniqueResults);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      getFriend(inputValue);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  const handleAdd = (friend: Friend) => {
    setAttendees((prev: Friend[]) => [...prev, friend]);
    setInputValue('');
    setSuggestions([]);
  };

  const handleRemove = (id: number) => {
    setAttendees((prev) => prev.filter((friend) => friend.id !== id));
  };

  return (
    <ThemedView style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 8,
          marginBottom: 16,
          height: 52
        }}
      >
        <Feather name="user-plus" size={16} color={themeColors.placeholderTextColor} style={{ marginRight: 10 }} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholderTextColor}
          style={{
            flex: 1,
            fontSize: 16,
            color: themeColors.text
          }}
          value={inputValue}
          onChangeText={setInputValue}
        />
      </View>

      {/* Suggestions List */}
      <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true}>
        {suggestions.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={{
              padding: 12,
              borderBottomWidth: index !== suggestions.length - 1 ? 1 : 0,
              borderBottomColor: themeColors.background,
            }}
            onPress={() => handleAdd(item)}
          >
            <Text style={{ fontWeight: 'bold', color: themeColors.text }}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Attendees List */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {attendees.slice(0, maxVisibleFriends - 1).map((friend) => (
          <View style={{ marginRight: 8, alignItems: 'center', justifyContent: 'center' }} key={friend.id}>
            <Friend name={friend.name} image={friend.image} size={52} />
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

        {attendees.length > maxVisibleFriends && (
          <TouchableOpacity
            style={{
              width: 52,
              height: 52,
              borderRadius: 30,
              backgroundColor: themeColors.inputBackgroundColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
              +{attendees.length - (maxVisibleFriends - 1)}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
};

export default Attendees;