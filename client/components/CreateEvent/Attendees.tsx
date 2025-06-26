import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// Define EventAttendee type locally to match context usage
type AttendeeStatus = 'pending' | 'maybe' | 'accepted' | 'rejected';
type EventAttendee = {
  user: AttendeeFriend;
  status?: AttendeeStatus;
};

interface AttendeesProps {
  limit: number | null;
  suggestions: AttendeeFriend[];
  setSuggestions: (suggestions: AttendeeFriend[]) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onSuggestionSelectRef: React.MutableRefObject<((item: any) => void) | null>;
}

const Attendees: React.FC<AttendeesProps> = ({ 
  limit, 
  suggestions, 
  setSuggestions, 
  showSuggestions, 
  setShowSuggestions,
  onSuggestionSelectRef 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [user, setUser] = useState<AttendeeFriend | null>(null);
  const [attendees, setAttendees] = useState<AttendeeFriend[]>([]);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { attendees: contextAttendees, settingEventAttendees } = useCreateEventContext();
  const { fetchUserData } = useUserData();
  const maxVisibleFriends = 4;
  const [refreshing, setRefreshing] = useState(false);

  // Use refs to track initialization and updates
  const isInitialized = useRef(false);
  const skipNextUpdate = useRef(false);
  const lastAttendeesList = useRef<string>('');
  
  // Initialize component once on mount
  useEffect(() => {
    const initializeComponent = async () => {
      // Only run once
      if (isInitialized.current) return;
      
      try {
        // Get current user
        const currentUser = await fetchUserData();
        if (!currentUser) return;
        setUser(currentUser);
        
        // Create initial attendees list
        let initialAttendees: AttendeeFriend[] = [];
        
        // If we have context attendees, use them as initial state
        if (contextAttendees && contextAttendees.length > 0) {
          initialAttendees = contextAttendees.map(a => a.user);
          
          // Make sure organizer is included and first
          const hasOrganizer = initialAttendees.some(a => a._id === currentUser._id);
          if (!hasOrganizer) {
            initialAttendees = [currentUser, ...initialAttendees];
          } else {
            // Move organizer to first position
            initialAttendees = [
              ...initialAttendees.filter(a => a._id === currentUser._id),
              ...initialAttendees.filter(a => a._id !== currentUser._id)
            ];
          }
        } else {
          // If no context attendees, just add the organizer
          initialAttendees = [currentUser];
        }
        
        // Set attendees state
        setAttendees(initialAttendees);
        
        // Set the last attendees list to avoid updates
        lastAttendeesList.current = JSON.stringify(initialAttendees.map(a => a._id));
        
        // Mark as initialized
        isInitialized.current = true;
        skipNextUpdate.current = true;
      } catch (error) {
        console.error('Error initializing attendees:', error);
      }
    };
    
    initializeComponent();
  }, []);

  // Update context when attendees change
  useEffect(() => {
    // Skip during initialization
    if (skipNextUpdate.current) {
      skipNextUpdate.current = false;
      return;
    }
    
    // Only update context if attendees have actually changed
    const currentAttendeesList = JSON.stringify(attendees.map(a => a._id));
    if (currentAttendeesList !== lastAttendeesList.current && attendees.length > 0) {
    settingEventAttendees(attendees);
      lastAttendeesList.current = currentAttendeesList;
    }
  }, [attendees, settingEventAttendees]);

  // Search functionality
  const fetchFriendResults = async (query: string): Promise<AttendeeFriend[]> => {
    try {
    const emailSearch = api.get(`/api/users/me/friends/search/by/email?query=${query}`);
    const nameSearch = api.get(`/api/users/me/friends/search/by/name?query=${query}`);

    const [emailResults, nameResults] = await Promise.all([emailSearch, nameSearch]);
    const combinedResults = [...emailResults.data, ...nameResults.data];
    const uniqueResults: AttendeeFriend[] = Array.from(
      new Map(combinedResults.map((item: AttendeeFriend) => [item.full_name, item])).values()
    );

    return uniqueResults;
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
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

  // Attendee management functions
  const handleAdd = (friend: AttendeeFriend) => {
    const alreadyAdded = attendees.some((f) => f._id === friend._id);
    if (alreadyAdded) return;
    if (limit !== null && attendees.length >= limit) return;

    setAttendees((prev) => [...prev, friend]);
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleRemove = (id: string) => {
    // Don't allow removing the organizer
    if (user && id === user._id) return;
    
    setAttendees((prev) => prev.filter((friend) => friend._id !== id));
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
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        onSuggestionSelectRef={onSuggestionSelectRef}
      />

      {/* Attendees List */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
        {attendees.slice(0, maxVisibleFriends - 1).map((friend) => (
          <View style={{ marginRight: 8, alignItems: 'center', justifyContent: 'center' }} key={friend._id}>
            <Friend 
              _id={friend._id} 
              full_name={friend.full_name}
              username={friend.username}
              profile_picture={friend.profile_picture} 
              size={52}
              showName={true}
              refreshing={refreshing}
              displayName={friend._id === user._id ? 'Organizer' : undefined}
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
                      full_name={friend.full_name}
                      username={friend.username}
                      profile_picture={friend.profile_picture}
                      size={40}
                      showName={true}
                      refreshing={refreshing}
                      displayName={friend._id === user._id ? 'Organizer' : undefined}
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