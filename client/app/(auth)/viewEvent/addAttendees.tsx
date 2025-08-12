/**
 * AddAttendees Screen - Manage event attendees (add/remove)
 * 
 * This screen replaces the modal approach for adding/removing attendees.
 * It receives the event data via navigation params and handles all attendee operations.
 */
import React, { useState, useCallback, useRef, useMemo } from 'react';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserListItem from '@/components/ViewEvent/UserListItem';
import type { Event as EventType, User, AttendeeFriend } from '@/types/allTypes';
import { useInviteAttendees } from '@/hooks/useNewEventMutations';
import { useRemoveAttendee } from '@/hooks/useSpecialMutations';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ViewEventModalProvider, useViewEventModal } from '@/context/ViewEventModalContext';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';
import { TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AddAttendeesScreenContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [newEventToViewId, setNewEventToViewId] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const inviteAttendeesMutation = useInviteAttendees();
  const removeAttendeeMutation = useRemoveAttendee();
  const router = useRouter();
  
  // Animated values for scroll handling
  const scrollY = useSharedValue(0);
  const isDismissing = useSharedValue(false);
  const bounceCompleted = useSharedValue(false);
  const wasDraggingAtTop = useSharedValue(false);

  // Get event data from navigation params
  const params = useLocalSearchParams();
  const initialEvent: EventType = params.event ? JSON.parse(params.event as string) : null;
  const [event, setEvent] = useState<EventType>(initialEvent);
  const occurrence_start = params.occurrence_start;
  const is_occurrence = params.is_occurrence;
  
  const handleDismiss = useCallback(() => {
    if (newEventToViewId) {
      // If there's a new event to view, replace the current route with it
      router.dismiss(1);
      router.replace(`/viewEvent/${newEventToViewId}`);
    } else {
      // Dismiss both this screen and the viewEvent screen to go back to the screen before
      router.back();
    }
  }, [router, newEventToViewId]);
  
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (isDismissing.value) return;
      
      const currentY = event.contentOffset.y;
      scrollY.value = currentY;

      // If bounce is completed and we're pulling down again
      if (bounceCompleted.value && currentY < -50) {
        isDismissing.value = true;
        runOnJS(handleDismiss)();
      }
    },
    onBeginDrag: (event) => {
      // Reset states if starting drag from below
      if (event.contentOffset.y > 50) {
        bounceCompleted.value = false;
        wasDraggingAtTop.value = false;
      }
      // Track if we're dragging from the top
      wasDraggingAtTop.value = event.contentOffset.y <= 0;
    },
    onEndDrag: (event) => {
      // If we were dragging at the top and ended the drag
      if (wasDraggingAtTop.value) {
        bounceCompleted.value = true;
      }
    }
  });
  const { userId: currentUserId } = useAuthSession();
  
  // Check if this is a recurring occurrence
  const isRecurringOccurrence = is_occurrence === 'true' && occurrence_start;
  
  // Check if current user is the event creator
  const isCreator = event?.creator?._id === currentUserId;
  
  // Cleanup effect
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Search state
  const [searchResults, setSearchResults] = useState<(AttendeeFriend & { isFromTag?: boolean; tagName?: string })[]>([]);
  
  // Type guard to check if item is a search result
  const isSearchResultItem = (item: unknown): item is (AttendeeFriend & { isFromTag?: boolean; tagName?: string }) => {
    return searchQuery.trim().length > 0;
  };
  
  // Type guard to check if item is an attendee
  const isAttendeeItem = (item: unknown): item is { user: User; status: 'pending' | 'maybe' | 'accepted' | 'rejected'; _id: string } => {
    return !searchQuery.trim().length;
  };
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Filter out users who are already attendees
  const existingAttendeeIds = useMemo(
    () => new Set(event?.attendees?.map(att => att.user._id) || []),
    [event?.attendees]
  );

  // Search functionality based on event visibility
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      let allResults = [];
      
      // Based on visibility, determine what to search
      if (event?.visibility === 'public') {
        // Public: search friends, non-friends, and tags
        const [friendsResponse, nonFriendsResponse, tagsResponse] = await Promise.all([
          api.get(`/api/users/me/friends/search?query=${encodeURIComponent(query)}`),
          api.get(`/api/users/me/kinovo/users/search?query=${encodeURIComponent(query)}`),
          api.get(`/api/users/tags/search?query=${encodeURIComponent(query)}`)
        ]);
        
        const friends = friendsResponse.data || [];
        const nonFriends = nonFriendsResponse.data || [];
        const tags = tagsResponse.data?.tags || [];
        
        // Process tags to extract users
        interface TagResult {
          activity_name: string;
          friends: AttendeeFriend[];
        }
        
        const tagUsers: (AttendeeFriend & { isFromTag: boolean; tagName: string })[] = [];
        tags.forEach((tag: TagResult) => {
          if (tag.friends && Array.isArray(tag.friends)) {
            tagUsers.push(...tag.friends.map((friend: AttendeeFriend) => ({
              ...friend,
              isFromTag: true,
              tagName: tag.activity_name
            })));
          }
        });
        
        // Combine all results
        allResults = [...friends, ...nonFriends, ...tagUsers];
      } else {
        // Friends ('private') and Private ('selected'): only search friends
        const friendsResponse = await api.get(`/api/users/me/friends/search?query=${encodeURIComponent(query)}`);
        allResults = friendsResponse.data || [];
      }
      
      // Filter out existing attendees
      const filteredResults = allResults.filter((user: AttendeeFriend) => user._id && !existingAttendeeIds.has(user._id));
      
      // Remove duplicates
      const uniqueResults = filteredResults.filter((user: AttendeeFriend, index: number, self: AttendeeFriend[]) =>
        index === self.findIndex((u: AttendeeFriend) => u._id && user._id && u._id === user._id)
      );
      
      setSearchResults(uniqueResults);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [event?.visibility, existingAttendeeIds]);
  
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    if (text.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(text);
      }, 300);
    } else {
      setSearchResults([]);
    }
  }, [searchUsers]);

  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const handleInviteUsers = useCallback(async (
    options?: { modifyType?: 'this_only' | 'all_future' }
  ) => {
    if (selectedUsers.size === 0) return;

    try {
      const eventId = event.isRecurringOccurrence ? event.originalEventId : event._id;
      const invitees = Array.from(selectedUsers);
      
      // Prepare mutation variables
      const variables: any = {
        eventId,
        invitees
      };

      // Add recurring event options if provided
      if (isRecurringOccurrence && options?.modifyType && occurrence_start) {
        const occurrenceDate = Array.isArray(occurrence_start) ? occurrence_start[0] : occurrence_start;
        variables.occurrenceDate = occurrenceDate;
        variables.modifyType = options.modifyType;
      }

      inviteAttendeesMutation.mutate(variables, {
        onSuccess: (data) => {
          // Check if we need to navigate to a new event (for recurring event modifications)
          const eventToViewId = data?.events?.find((e: any) => e.eventToView)?._id;
          
          // Store the new event ID if it exists
          if (eventToViewId) {
            setNewEventToViewId(eventToViewId);
          }
          
          // Add the invited users to the event's attendees list
          const invitedUserDetails = searchResults.filter((user: AttendeeFriend & { isFromTag?: boolean; tagName?: string }) => 
            user._id && selectedUsers.has(user._id)
          );
          
          const newAttendees = invitedUserDetails.map((user: AttendeeFriend & { isFromTag?: boolean; tagName?: string }) => ({
            _id: `temp_${user._id}_${Date.now()}`, // Temporary ID for the attendee object
            user: user as User, // Cast AttendeeFriend to User since they should be compatible
            status: 'pending' as const
          }));
          
          // Update the event with new attendees
          setEvent(prevEvent => ({
            ...prevEvent,
            attendees: [...(prevEvent.attendees || []), ...newAttendees]
          }));
          
          const message = options?.modifyType === 'this_only' 
            ? 'Successfully invited users to this specific event occurrence.'
            : options?.modifyType === 'all_future'
            ? 'Successfully invited users to all future occurrences of this event.'
            : 'Successfully invited users to the event.';
            
          Alert.alert('Success', message, [
            { text: 'OK', onPress: () => {
              setSelectedUsers(new Set());
              setSearchQuery('');
              setSearchResults([]);
            }}
          ]);
        },
        onError: (error) => {
          console.error('Error inviting users:', error);
          Alert.alert('Error', 'Failed to invite users. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error inviting users:', error);
    }
  }, [selectedUsers, event, isRecurringOccurrence, occurrence_start, inviteAttendeesMutation]);

  const handleRemoveAttendee = useCallback(async (
    attendeeId: string,
    options?: { modifyType?: 'this_only' | 'all_future' }
  ) => {
    const variables: any = {
      eventId: event._id,
      attendeeId
    };

    // Add recurring event options if provided
    if (isRecurringOccurrence && options?.modifyType && occurrence_start) {
      const occurrenceDate = Array.isArray(occurrence_start) ? occurrence_start[0] : occurrence_start;
      variables.occurrenceDate = occurrenceDate;
      variables.modifyType = options.modifyType;
    }

    removeAttendeeMutation.mutate(variables, {
      onSuccess: (data) => {
        // Check if we need to navigate to a new event (for recurring event modifications)
        const eventToViewId = data?.events?.find((e: any) => e.eventToView)?._id;
          
        // Store the new event ID if it exists
        if (eventToViewId) {
          setNewEventToViewId(eventToViewId);
        }
        // Remove the attendee from the event's attendees list
        setEvent(prevEvent => ({
          ...prevEvent,
          attendees: prevEvent.attendees?.filter(att => att.user._id !== attendeeId) || []
        }));
        
        const message = options?.modifyType === 'this_only' 
          ? 'Successfully removed attendee from this occurrence.'
          : options?.modifyType === 'all_future'
          ? 'Successfully removed attendee from all future occurrences.'
          : 'Successfully removed attendee from the event.';
          
        Alert.alert('Success', message);
      },
      onError: (error) => {
        console.error('Error removing attendee:', error);
        Alert.alert('Error', 'Failed to remove attendee. Please try again.');
      }
    });
  }, [event._id, isRecurringOccurrence, occurrence_start, removeAttendeeMutation]);

  const { showModal } = useViewEventModal();

  const showInviteAlert = () => {
    if (!event.recurrence?.checked || !isRecurringOccurrence) {
      handleInviteUsers();
      return;
    }

    showModal('invite_recurring_confirm', {
      onConfirm: handleInviteUsers
    });
  };

  const showRemoveAttendeeAlert = (attendeeId: string, attendeeName: string) => {
    if (!event.recurrence?.checked || !isRecurringOccurrence) {
      showModal('attendee_remove_confirm', {
        attendeeId,
        onConfirm: handleRemoveAttendee
      });
      return;
    }

    // For recurring events, show options
    showModal('remove_attendee_recurring', {
      attendeeId,
      attendeeName,
      onConfirm: handleRemoveAttendee
    });
  };

  // Memoized FlatList functions
  const keyExtractor = useCallback((item: unknown) => {
    // Add null/undefined checks
    if (!item || typeof item !== 'object') {
      return `invalid_${Math.random()}`;
    }
    
    if (isSearchResultItem(item)) {
      return item._id || `search_${Math.random()}`;
    } else if (isAttendeeItem(item)) {
      const userId = item.user?._id;
      const attendeeId = item._id;
      return userId || attendeeId || `attendee_${Math.random()}`;
    }
    
    return `unknown_${Math.random()}`;
  }, []);

  const renderListEmptyComponent = useMemo(() => {
    if (searchQuery.trim()) {
      return isSearching ? (
        <ThemedText style={{ textAlign: 'center', marginTop: 20, color: themeColors.textSecondary }}>
          Searching...
        </ThemedText>
      ) : (
        <ThemedText style={{ textAlign: 'center', marginTop: 20, color: themeColors.textSecondary }}>
          No users found
        </ThemedText>
      );
    } else {
      return (
        <ThemedText style={{ textAlign: 'center', marginTop: 20, color: themeColors.textSecondary }}>
          No attendees yet
        </ThemedText>
      );
    }
  }, [searchQuery, isSearching, themeColors.textSecondary]);

  const renderItem = useCallback(({ item }: { item: unknown }) => {
    // Add null/undefined checks
    if (!item || typeof item !== 'object') {
      return null;
    }
    
    // Type-safe handling of different item types
    let user: User | AttendeeFriend;
    let userId: string | undefined;
    let attendeeStatus: string | undefined;
    
    if (isSearchResultItem(item)) {
      // Search result item
      user = item;
      userId = item._id;
      attendeeStatus = undefined;
    } else if (isAttendeeItem(item)) {
      // Attendee item
      if (!item.user) {
        return null;
      }
      user = item.user;
      userId = item.user._id;
      attendeeStatus = item.status;
    } else {
      return null;
    }
    
    const isSearching = isSearchResultItem(item);
    
    return (
      <TouchableOpacity
        onPress={isSearching && userId ? () => handleSelectUser(userId) : undefined}
        disabled={!isSearching}
        style={{
          marginBottom: 12,
          paddingVertical: 8,
          paddingHorizontal: 8,
          backgroundColor: isSearching && userId && selectedUsers.has(userId)
            ? themeColors.mountainGreen + '20'
            : themeColors.eventCardBackgroundColor,
          borderRadius: 8,
        }}
      >
        <UserListItem
          _id={userId || ''}
          name={user.full_name || ''}
          username={
            'isFromTag' in user && user.isFromTag 
              ? `${user.username || ''} • From tag: ${(user as AttendeeFriend & { tagName?: string }).tagName || ''}` 
              : user.username || ''
          }
          avatarUri={user.profile_picture}
          disableNavigation
          rightElement={
            isSearching ? (
              // Search result - show checkbox
              <View style={{ 
                width: 24, 
                height: 24, 
                borderRadius: 12,
                borderWidth: 2,
                borderColor: userId && selectedUsers.has(userId) ? themeColors.mountainGreen : themeColors.border,
                backgroundColor: userId && selectedUsers.has(userId) ? themeColors.mountainGreen : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                {userId && selectedUsers.has(userId) && (
                  <Feather name="check" size={14} color="white" />
                )}
              </View>
            ) : (
              // Current attendee - show status and remove button
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {isCreator && userId && userId !== currentUserId && (
                  <TouchableOpacity
                    onPress={() => showRemoveAttendeeAlert(userId, user.full_name || '')}
                    style={{
                      padding: 4,
                    }}
                  >
                    <Feather name="x-circle" size={20} color={themeColors.specialRed} />
                  </TouchableOpacity>
                )}
              </View>
            )
          }
        />
      </TouchableOpacity>
    );
  }, [
    handleSelectUser, 
    selectedUsers,
    isCreator, 
    currentUserId, 
    showRemoveAttendeeAlert
  ]);

  const flatListData = useMemo(() => {
    const data = searchQuery.trim() ? searchResults : (event.attendees || []);
    // Filter out any null/undefined items
    const filteredData = data.filter(item => item && typeof item === 'object');
    return filteredData as ReadonlyArray<unknown>;
  }, [searchQuery, searchResults, event.attendees]);

  if (!event) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>No event data available</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Manage Attendees',
          headerStyle: { backgroundColor: themeColors.background },
          headerTintColor: themeColors.text,
        }}
      />
      <ThemedView style={{ flex: 1 }}>
        {/* Search Bar */}
        <View style={{ padding: 16 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            paddingHorizontal: 16,
            height: 44,
            borderWidth: searchQuery.length > 0 ? 2 : 0,
            borderColor: searchQuery.length > 0 ? themeColors.tint : 'transparent',
          }}>
            <Feather 
              name="search" 
              size={18} 
              color={themeColors.placeholderTextColor} 
              style={{ marginRight: 12 }} 
            />
            <TextInput
              placeholder="Search users to invite..."
              placeholderTextColor={themeColors.placeholderTextColor}
              value={searchQuery}
              onChangeText={handleSearchChange}
              style={{
                flex: 1,
                fontSize: 16,
                color: themeColors.text,
                fontWeight: '400',
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                style={{ padding: 4 }}
              >
                <Feather 
                  name="x" 
                  size={16} 
                  color={themeColors.placeholderTextColor} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Main List - shows search results when searching, otherwise current attendees */}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {!searchQuery.trim() && (
            <ThemedText style={{ 
              fontSize: 16, 
              fontWeight: 'bold', 
              marginBottom: 12,
              color: themeColors.text
            }}>
              Current Attendees ({event.attendees?.length || 0})
            </ThemedText>
          )}
          
          <Animated.FlatList
            data={flatListData}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            bounces={true}
            overScrollMode="always"
            ListEmptyComponent={renderListEmptyComponent}
            renderItem={renderItem}
          />
        </View>

        {/* Invite Button - shown when users are selected */}
        {selectedUsers.size > 0 && (
          <View style={{
            position: 'absolute',
            bottom: insets.bottom + 16,
            left: 16,
            right: 16,
          }}>
            <TouchableOpacity
              onPress={showInviteAlert}
              disabled={inviteAttendeesMutation.isPending}
              style={{
                backgroundColor: themeColors.mountainGreen,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: 'center',
                opacity: inviteAttendeesMutation.isPending ? 0.5 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <ThemedText style={{ 
                color: 'white',
                fontSize: 16,
                fontWeight: 'bold'
              }}>
                {inviteAttendeesMutation.isPending 
                  ? 'Inviting...' 
                  : `Invite ${selectedUsers.size} User${selectedUsers.size > 1 ? 's' : ''}`
                }
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>
    </>
  );
};

const AddAttendeesScreen: React.FC = () => {
  // Get event data from navigation params
  const params = useLocalSearchParams();
  const event: EventType = params.event ? JSON.parse(params.event as string) : null;
  
  if (!event) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>No event data available</ThemedText>
      </ThemedView>
    );
  }
  
  return (
    <ViewEventModalProvider event={event}>
      <AddAttendeesScreenContent />
    </ViewEventModalProvider>
  );
};

export default AddAttendeesScreen;