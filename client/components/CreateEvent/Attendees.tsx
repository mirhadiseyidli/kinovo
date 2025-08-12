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

interface SuggestionsData {
  friends: AttendeeFriend[];
  nonFriends: AttendeeFriend[];
  tags: {
    activity_name: string;
    friends: AttendeeFriend[];
  }[];
}

interface AttendeesProps {
  limit: number | null;
  suggestions: AttendeeFriend[];
  setSuggestions: (suggestions: AttendeeFriend[]) => void;
  suggestionsData: SuggestionsData;
  setSuggestionsData: (data: SuggestionsData) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onSuggestionSelectRef: React.MutableRefObject<((item: any) => void) | null>;
  onInputPositionChange?: (position: { x: number; y: number; width: number; height: number } | null) => void;
}

/**
 * Attendees Component - MIGRATED to New TanStack Query Architecture
 * 
 * Key improvements over the old implementation:
 * - Uses new useUserData hook with simplified TanStack Query architecture
 * - Direct data access instead of async fetchUserData calls
 * - Better performance through reactive data updates
 * - Simplified initialization logic
 * - Consistent with other migrated components
 */
const Attendees: React.FC<AttendeesProps> = ({ 
  limit, 
  suggestions, 
  setSuggestions, 
  suggestionsData,
  setSuggestionsData,
  showSuggestions, 
  setShowSuggestions,
  onSuggestionSelectRef,
  onInputPositionChange
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [attendees, setAttendees] = useState<AttendeeFriend[]>([]);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { attendees: contextAttendees, settingEventAttendees, visibility } = useCreateEventContext();
  const { user: currentUser, loading: userLoading } = useUserData();
  const maxVisibleFriends = 4;
  const [refreshing, setRefreshing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Use refs to track initialization and updates
  const isInitialized = useRef(false);
  const skipNextUpdate = useRef(false);

  // Cleanup effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);
  const lastAttendeesList = useRef<string>('');
  
  // Initialize component when user data is available
  useEffect(() => {
    // Only run once and when we have user data
    if (isInitialized.current || !currentUser || userLoading) return;
    
    try {
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
  }, [currentUser, userLoading, contextAttendees]);

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

  // Search functionality for friends and non-friends
  const fetchFriendsResults = async (query: string): Promise<AttendeeFriend[]> => {
    try {
      const response = await api.get(`/api/users/me/friends/search?query=${query}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  };

  const fetchNonFriendsResults = async (query: string): Promise<AttendeeFriend[]> => {
    try {
      const response = await api.get(`/api/users/me/kinovo/users/search?query=${query}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching non-friends:', error);
      return [];
    }
  };

  const fetchTagsResults = async (query: string): Promise<any[]> => {
    try {
      // Use a search-specific endpoint that handles the query server-side
      const response = await api.get(`/api/users/tags/search?query=${encodeURIComponent(query)}`);
      return response.data.tags || [];
    } catch (error) {
      console.error('Error searching tags:', error);
      return [];
    }
  };

  const getSearchResults = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setSuggestionsData({ friends: [], nonFriends: [], tags: [] });
      return;
    }

    try {
      let friendsResults: AttendeeFriend[] = [];
      let nonFriendsResults: AttendeeFriend[] = [];
      let tagsResults: any[] = [];

      // Based on visibility, determine what to search
      if (visibility === 'public') {
        // Public: search everyone (friends + non-friends) and tags
        const [friendsData, nonFriendsData, tagsData] = await Promise.all([
          fetchFriendsResults(query),
          fetchNonFriendsResults(query),
          fetchTagsResults(query)
        ]);
        friendsResults = friendsData;
        nonFriendsResults = nonFriendsData;
        tagsResults = tagsData;
      } else {
        // Friends ('private') and Private ('selected'): only search friends and tags
        const [friendsData, tagsData] = await Promise.all([
          fetchFriendsResults(query),
          fetchTagsResults(query)
        ]);
        friendsResults = friendsData;
        nonFriendsResults = []; // No non-friends for private/friends visibility
        tagsResults = tagsData;
      }

      // Filter out already added attendees
      const availableFriends = friendsResults.filter((friend) => 
        !attendees.some((a) => a._id === friend._id)
      );
      
      const availableNonFriends = nonFriendsResults.filter((user) => 
        !attendees.some((a) => a._id === user._id)
      );

      // Filter tags to only include those with friends not already added
      const availableTags = tagsResults.map((tag) => ({
        ...tag,
        friends: tag.friends.filter((friend: AttendeeFriend) => 
          !attendees.some((a) => a._id === friend._id)
        )
      }));
      
      // Only show tags with available friends
      const tagsWithAvailableFriends = availableTags.filter((tag) => tag.friends.length > 0);

      // Store separated data for sectioned display
      setSuggestionsData({ 
        friends: availableFriends, 
        nonFriends: availableNonFriends,
        tags: tagsWithAvailableFriends
      });

      // Keep the combined results for backward compatibility - include tags to trigger showSuggestions
      const combinedResults = [...availableFriends, ...availableNonFriends, ...tagsWithAvailableFriends];
      setSuggestions(combinedResults);
    } catch (error: unknown) {
      const err = error as ApiError;
      console.error('Failed to fetch search results:', err);
      setSuggestions([]);
      setSuggestionsData({ friends: [], nonFriends: [], tags: [] });
    }
  };

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        getSearchResults(inputValue);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [inputValue, visibility]); // Add visibility as dependency

  // Attendee management functions
  const handleAdd = (friendOrTag: AttendeeFriend | { activity_name: string; friends: AttendeeFriend[] }) => {
    if (!mountedRef.current) return;
    
    // Check if it's a tag (has activity_name property)
    if ('activity_name' in friendOrTag) {
      // It's a tag - add all friends from the tag
      const tag = friendOrTag;
      const friendsToAdd = tag.friends.filter(friend => 
        !attendees.some((a) => a._id === friend._id)
      );
      
      // Check if adding all friends would exceed the limit
      if (limit !== null && attendees.length + friendsToAdd.length > limit) {
        const remainingSlots = limit - attendees.length;
        if (remainingSlots <= 0) return;
        // Only add as many friends as the limit allows
        friendsToAdd.splice(remainingSlots);
      }
      
      setAttendees((prev) => [...prev, ...friendsToAdd]);
    } else {
      // It's a single friend
      const friend = friendOrTag;
      const alreadyAdded = attendees.some((f) => f._id === friend._id);
      if (alreadyAdded) return;
      if (limit !== null && attendees.length >= limit) return;

      setAttendees((prev) => [...prev, friend]);
    }
    
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleRemove = (id: string) => {
    if (!mountedRef.current) return;
    
    // Don't allow removing the organizer
    if (currentUser && id === currentUser._id) return;
    
    setAttendees((prev) => prev.filter((friend) => friend._id !== id));
  };

  const truncateName = (full_name: string | undefined, maxLength: number) => {
    if (!full_name) return '';
    return full_name.length > maxLength ? `${full_name.substring(0, maxLength)}...` : full_name;
  };

  if (!currentUser || userLoading) return null;

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
        onInputPositionChange={onInputPositionChange}
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
              displayName={friend._id === currentUser._id ? 'Organizer' : undefined}
            />
            {friend._id !== currentUser._id && (
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
                      displayName={friend._id === currentUser._id ? 'Organizer' : undefined}
                    />
                  </View>
                  {friend._id !== currentUser._id && (
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