import React, { useState, useEffect, useCallback } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Platform, Dimensions, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchFriendsBar from '@/components/SearchFriendsBar';
import UserListItem from './UserListItem';
import type { Friend, Event as EventType } from '@/types/allTypes';
import api from '@/utils/api';
import { useGetMyFriends } from '@/hooks/useGetMyFriends';
import { useViewEventModal } from '../../app/(auth)/viewEvent/[event_id]';
import { useLocalSearchParams } from 'expo-router';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddAttendeesModalProps {
  visible: boolean;
  onClose: () => void;
  event: EventType;
  onInviteSuccess: () => void;
}

const AddAttendeesModal: React.FC<AddAttendeesModalProps> = ({
  visible,
  onClose,
  event,
  onInviteSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const { fetchFriends } = useGetMyFriends();
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const { showModal } = useViewEventModal();
  const { occurrence_start, is_occurrence } = useLocalSearchParams();
  
  // Check if this is a recurring occurrence
  const isRecurringOccurrence = is_occurrence === 'true' && occurrence_start;

  // Fetch friends list when modal opens
  useEffect(() => {
    if (visible) {
      const getFriendsList = async () => {
        setLoading(true);
        try {
          const fetchedFriendsList = await fetchFriends();
          // Filter out friends who are already invited
          const existingInvitees = new Set(event.attendees?.map(att => att.user._id) || []);
          const filteredFriends = fetchedFriendsList.filter((friend: Friend) => !existingInvitees.has(friend._id));
          setFriendsList(filteredFriends);
        } catch (error) {
          console.error('Error fetching friends:', error);
        } finally {
          setLoading(false);
        }
      };
      getFriendsList();
    } else {
      // Reset state when modal closes
      setSearchQuery('');
      setSelectedFriends(new Set());
    }
  }, [visible, event.attendees]);

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const handleInviteFriends = useCallback(async (
    options?: { modifyType?: 'this_only' | 'all_future' }
  ) => {
    if (selectedFriends.size === 0) return;

    setLoading(true);
    try {
      const eventId = event.isRecurringOccurrence ? event.originalEventId : event._id;
      const requestBody: any = {
        invitees: Array.from(selectedFriends)
      };

      // Add recurring event options if provided
      if (isRecurringOccurrence && options?.modifyType && occurrence_start) {
        const occurrenceDate = Array.isArray(occurrence_start) ? occurrence_start[0] : occurrence_start;
        requestBody.occurrenceDate = occurrenceDate;
        requestBody.modifyType = options.modifyType;
      }

      await api.post(`/api/manageevents/eventslist/${eventId}/invite`, requestBody);
      
      onInviteSuccess();
      onClose();
      
      const message = options?.modifyType === 'this_only' 
        ? 'Successfully invited friends to this specific event occurrence.'
        : options?.modifyType === 'all_future'
        ? 'Successfully invited friends to all future occurrences of this event.'
        : 'Successfully invited friends to the event.';
        
      Alert.alert('Success', message);
    } catch (error) {
      console.error('Error inviting friends:', error);
      showModal('invite_error');
    } finally {
      setLoading(false);
    }
  }, [selectedFriends, event, isRecurringOccurrence, occurrence_start, onInviteSuccess, onClose, showModal]);

  const showRecurringEventAlert = () => {
    if (!event.recurrence?.checked || !isRecurringOccurrence) {
      handleInviteFriends();
      return;
    }

    showModal('invite_recurring_confirm', {
      onConfirm: handleInviteFriends
    });
  };

  const filteredFriends = friendsList.filter(friend => 
    friend.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ 
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
      }}>
        <TouchableOpacity 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={{
          height: SCREEN_HEIGHT * 0.5,
          width: '100%',
          backgroundColor: themeColors.background,
          borderRadius: 20,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
          }}>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>Add Attendees</ThemedText>
            <TouchableOpacity 
              onPress={showRecurringEventAlert}
              disabled={selectedFriends.size === 0 || loading}
              style={{ opacity: selectedFriends.size === 0 || loading ? 0.5 : 1 }}
            >
              <ThemedText style={{ 
                color: selectedFriends.size > 0 ? themeColors.mountainGreen : themeColors.tint,
                fontWeight: 'bold'
              }}>
                {loading ? 'Inviting...' : 'Invite'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={{ padding: 16 }}>
            <SearchFriendsBar
              placeholder="Search friends..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Friends List */}
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ 
              padding: 16,
              width: '100%',
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ThemedText style={{ textAlign: 'center', marginTop: 20 }}>Loading...</ThemedText>
            ) : filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => (
                <TouchableOpacity
                  key={friend._id}
                  onPress={() => toggleFriendSelection(friend._id)}
                  style={{
                    marginBottom: 12,
                    paddingVertical: 8,
                    paddingHorizontal: 8,
                    backgroundColor: selectedFriends.has(friend._id) 
                      ? themeColors.mountainGreen + '20'
                      : 'transparent',
                    borderRadius: 8,
                    width: '100%',
                  }}
                >
                  <UserListItem
                    _id={friend._id}
                    name={friend.full_name}
                    username={friend.username}
                    avatarUri={friend.profile_picture}
                    disableNavigation
                    rightElement={
                      <View style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: selectedFriends.has(friend._id) ? themeColors.mountainGreen : themeColors.border,
                        backgroundColor: selectedFriends.has(friend._id) ? themeColors.mountainGreen : 'transparent',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        {selectedFriends.has(friend._id) && (
                          <Feather name="check" size={14} color="white" />
                        )}
                      </View>
                    }
                  />
                </TouchableOpacity>
              ))
            ) : (
              <ThemedText style={{ textAlign: 'center', marginTop: 20 }}>
                {searchQuery ? 'No friends found' : 'No friends available to invite'}
              </ThemedText>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default AddAttendeesModal; 