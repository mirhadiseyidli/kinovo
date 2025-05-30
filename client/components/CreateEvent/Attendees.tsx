import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, Dimensions, ScrollView, Image, Modal, Keyboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import Friend from '@/components/Friend';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { AttendeeFriend } from '@/types/allTypes';
import { ApiError } from '@/types/allTypes';
import SearchUsersFriendsBar from '../SearchUsersFriendsBar';
import { useCreateEventContext } from '@/context/CreateEventContext';
import { useUserData } from '@/hooks/useUserData';
import api from '@/utils/api';

const Attendees: React.FC<{ limit: number | null }> = ({ limit }) => {
  const [attendees, setAttendees] = useState<AttendeeFriend[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<AttendeeFriend[]>([]);
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [user, setUser] = useState<AttendeeFriend | null>(null);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
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

  const fetchFriendResults = async (query: string): Promise<AttendeeFriend[]> => {
    const emailSearch = api.get(`/api/users/me/friends/search/by/email?query=${query}`);
    const nameSearch = api.get(`/api/users/me/friends/search/by/name?query=${query}`);

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
      const results = await fetchFriendResults(query);
      setSuggestions(results.filter((friend) => !attendees.some((a) => a._id === friend._id)));
    } catch (error: unknown) {
      const err = error as ApiError;
      console.error('Failed to fetch friends:', err);
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
    if (limit !== null && attendees.length > limit - 1) return;

    setAttendees((prev: AttendeeFriend[]) => [...prev, friend]);
    setInputValue('');
    setSuggestions([]);
    Keyboard.dismiss();
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

      {/* All Attendees Modal */}
      <Modal
        visible={showAllAttendees}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAllAttendees(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16
          }}
          activeOpacity={1}
          onPress={() => setShowAllAttendees(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: themeColors.background,
              borderRadius: 16,
              width: '100%',
              maxHeight: '80%',
              padding: 16
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                All Attendees
              </ThemedText>
              <TouchableOpacity onPress={() => setShowAllAttendees(false)}>
                <Feather name="x" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {attendees.map((friend) => (
                <View key={friend._id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Friend 
                      _id={friend._id}
                      full_name={friend._id === user._id ? 'Organizer' : friend.full_name}
                      username={friend.username}
                      profile_picture={friend.profile_picture}
                      size={40}
                      showName={true}
                      refreshing={refreshing}
                    />
                  </View>
                  {friend._id !== user._id && (
                    <TouchableOpacity
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: themeColors.inputBackgroundColor
                      }}
                      onPress={() => handleRemove(friend._id!)}
                    >
                      <Feather name="trash-2" size={16} color="red" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
};

export default Attendees;