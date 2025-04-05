import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, Dimensions, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import Friend from '@/components/Friend';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AttendeeFriend } from '@/types/allTypes';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { ApiError } from '@/types/allTypes';
import SearchUsersFriendsBar from '../SearchUsersFriendsBar';
import { useCreateEventContext } from '@/context/CreateEventContext';
import { useUserData } from '@/hooks/useUserData';

const Attendees: React.FC<{ limit: number | null }> = ({ limit }) => {
  const [attendees, setAttendees] = useState<AttendeeFriend[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<AttendeeFriend[]>([]);
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [user, setUser] = useState<AttendeeFriend | null>(null);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { refreshAccessToken } = useAuthSession();
  const { settingEventAttendees } = useCreateEventContext();
  const { fetchUserData } = useUserData();
  const maxVisibleFriends = 4; // Estimate based on circle + margin (50px + 6px)
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await fetchUserData();
      if (currentUser) {
        setUser(currentUser);
        setAttendees((prev) => {
          const exists = prev.some((a) => a._id === currentUser._id);
          return exists ? prev : [currentUser, ...prev];
        });
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    settingEventAttendees(attendees);
  }, [attendees]);

  const fetchFriendResults = async (query: string, accessToken: string): Promise<AttendeeFriend[]> => {
    const emailSearch = axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/me/friends/search/by/email?query=${query}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
    });

    const nameSearch = axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/me/friends/search/by/name?query=${query}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
    });

    const [emailResults, nameResults] = await Promise.all([emailSearch, nameSearch]);
    const combinedResults = [...emailResults.data, ...nameResults.data];
    const uniqueResults: AttendeeFriend[] = Array.from(
      new Map(combinedResults.map((item: AttendeeFriend) => [item.full_name, item])).values()
    );

    return uniqueResults;
  };

  const getFriend = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) throw new Error('No access token');

      const results = await fetchFriendResults(query, accessToken);
      setSuggestions(results.filter((friend) => !attendees.some((a) => a._id === friend._id)));
    } catch (error: unknown) {
      const err = error as ApiError;
      if (err.response?.status === 401) {
        try {
          console.log('couldnt search or update the token')
          await refreshAccessToken();
          const newAccessToken = await AsyncStorage.getItem('accessToken');
          if (newAccessToken) {
            const results = await fetchFriendResults(query, newAccessToken);
            setSuggestions(results.filter((friend) => !attendees.some((a) => a._id === friend._id)));
          }
        } catch (refreshErr) {
          console.error('Retry after refresh failed:', refreshErr);
        }
      } else {
        console.error(err);
      }
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

  const handleAdd = (friend: AttendeeFriend) => {
    const alreadyAdded = attendees.some((f) => f._id === friend._id);
    if (alreadyAdded) return;
    console.log(limit)
    if (limit !== null && attendees.length > limit - 1) return;

    setAttendees((prev: AttendeeFriend[]) => [...prev, friend]);
    setInputValue('');
    setSuggestions([]);
  };

  const handleRemove = (id: string) => {
    const updated = attendees.filter((friend) => friend._id !== id);
    setAttendees(updated);
  };

  const truncateName = (full_name: string | undefined, maxLength: number) => {
    if (!full_name) return '';
    return full_name.length > maxLength ? `${full_name.substring(0, maxLength)}...` : full_name;
  };

  if (!user) return null;

  return (
    <ThemedView style={{ marginBottom: 16 }}>
      <SearchUsersFriendsBar
        inputValue={inputValue}
        setInputValue={setInputValue}
        suggestions={suggestions}
        handleAdd={handleAdd}
        placeholder="Add People"
      />

      {/* Attendees List */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
        {attendees.slice(0, maxVisibleFriends - 1).map((friend) => (
          <View style={{ marginRight: 8, alignItems: 'center', justifyContent: 'center' }} key={friend._id}>
            <Friend 
              _id={friend._id} 
              full_name={friend._id === user._id ? 'Organizer' : friend.full_name}
              username={friend.username}
              profile_picture={friend.profile_picture} 
              size={52}
              showName={true}
              refreshing={refreshing}
            />
            {friend._id !== user._id && (
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
                onPress={() => handleRemove(friend._id!)}
              >
                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {attendees.length >= maxVisibleFriends && (
          <TouchableOpacity
            style={{
              width: 52,
              height: 52,
              borderRadius: 30,
              backgroundColor: themeColors.inputBackgroundColor,
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'flex-start'
            }}
            onPress={() => setShowAllAttendees(true)}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
              +{attendees.length - (maxVisibleFriends - 1)}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {showAllAttendees && (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <ThemedText style={{ fontSize: 14, fontWeight: 'bold' }}>
              All Attendees
            </ThemedText>
            <TouchableOpacity onPress={() => setShowAllAttendees(false)}>
              <Text style={{ color: themeColors.tint }}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            {attendees.map((friend) => (
              <View key={friend._id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Friend 
                    _id={friend._id} 
                    full_name={friend._id === user._id ? 'Organizer' : friend.full_name}
                    username={friend.username}
                    profile_picture={friend.profile_picture ? { uri: friend.profile_picture } : require('@/assets/profile-pic-2.jpeg')} 
                    size={40}
                    showName={false}
                    refreshing={refreshing}
                  />
                  <View>
                    <ThemedText style={{ marginLeft: 8, fontSize: 16 }}>{truncateName(friend.full_name, 24)}</ThemedText>
                    <ThemedText style={{ marginLeft: 8, fontSize: 14, color: themeColors.placeholderTextColor }}>{truncateName(friend.username, 24)}</ThemedText>
                  </View>
                </View>
                {friend._id !== user._id && (
                  <TouchableOpacity onPress={() => handleRemove(friend._id!)}>
                    <Feather name="x" size={24} color="red" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </ThemedView>
  );
};

export default Attendees;