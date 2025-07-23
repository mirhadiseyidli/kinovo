import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { jwtDecode } from 'jwt-decode';
import { 
  useEventCrudMutations, 
  CreateEventData, 
  UpdateEventData 
} from '@/hooks/useCrudMutations';
import { useInfiniteUpcomingEventsQuery } from '@/hooks/useInfiniteEventsQuery';

/**
 * CRUD Mutations Example Component
 * 
 * This component demonstrates how to use the CRUD mutation hooks with:
 * - Optimistic updates for immediate UI feedback
 * - Proper error handling and rollback mechanisms
 * - Integration with infinite queries
 * - Real-time cache updates
 */

export const CrudMutationsExample: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { accessToken } = useAuthSession();
  const userId = accessToken?.current ? (jwtDecode(accessToken.current) as any)?._id : null;

  // Form state
  const [formData, setFormData] = useState<Partial<CreateEventData>>({
    title: '',
    description: '',
    location: {
      text: '',
      city: null,
      state: null,
      coordinates: { lat: null, lng: null }
    },
    category: 'social',
    visibility: 'public',
  });

  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Use CRUD mutations with optimistic updates
  const {
    createEvent,
    updateEvent,
    deleteEvent,
    joinEvent,
    leaveEvent,
    isLoading,
    error,
    resetAll,
  } = useEventCrudMutations({
    userId,
    enableOptimisticUpdates: true,
    invalidateQueries: true,
    onSuccess: (data) => {
      console.log('✅ Operation successful:', data);
    },
    onError: (error) => {
      console.error('❌ Operation failed:', error);
    },
  });

  // Get upcoming events to display
  const { events, totalCount } = useInfiniteUpcomingEventsQuery({
    userId: userId || '',
    pageSize: 5,
    enabled: !!userId,
  });

  // Don't render in production
  if (!__DEV__) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>CRUD Mutations Example only available in development</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text }}>Please log in to use CRUD mutations</Text>
      </View>
    );
  }

  const handleCreateEvent = async () => {
    if (!formData.title?.trim()) {
      Alert.alert('Error', 'Event title is required');
      return;
    }

    try {
      const eventData: CreateEventData = {
        title: formData.title,
        description: formData.description || '',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
        location: formData.location || { text: 'TBD', city: null, state: null, coordinates: { lat: null, lng: null } },
        category: formData.category || 'social',
        visibility: formData.visibility || 'public',
      };

      await createEvent.mutateAsync(eventData);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        location: {
          text: '',
          city: null,
          state: null,
          coordinates: { lat: null, lng: null }
        },
        category: 'social',
        visibility: 'public',
      });
      
      Alert.alert('Success', 'Event created successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to create event: ${error}`);
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEventId) {
      Alert.alert('Error', 'Please select an event to update');
      return;
    }

    try {
      const updateData: UpdateEventData = {
        id: selectedEventId,
        title: formData.title || undefined,
        description: formData.description || undefined,
        location: formData.location || undefined,
      };

      await updateEvent.mutateAsync(updateData);
      Alert.alert('Success', 'Event updated successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to update event: ${error}`);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventId) {
      Alert.alert('Error', 'Please select an event to delete');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent.mutateAsync({ id: selectedEventId });
              setSelectedEventId('');
              Alert.alert('Success', 'Event deleted successfully!');
            } catch (error) {
              Alert.alert('Error', `Failed to delete event: ${error}`);
            }
          },
        },
      ]
    );
  };

  const handleJoinEvent = async () => {
    if (!selectedEventId) {
      Alert.alert('Error', 'Please select an event to join');
      return;
    }

    try {
      await joinEvent.mutateAsync({ eventId: selectedEventId, userId });
      Alert.alert('Success', 'Joined event successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to join event: ${error}`);
    }
  };

  const handleLeaveEvent = async () => {
    if (!selectedEventId) {
      Alert.alert('Error', 'Please select an event to leave');
      return;
    }

    try {
      await leaveEvent.mutateAsync({ eventId: selectedEventId, userId });
      Alert.alert('Success', 'Left event successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to leave event: ${error}`);
    }
  };

  const handleResetAll = () => {
    resetAll();
    setFormData({
      title: '',
      description: '',
      location: {
        text: '',
        city: null,
        state: null,
        coordinates: { lat: null, lng: null }
      },
      category: 'social',
      visibility: 'public',
    });
    setSelectedEventId('');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20 }}>
        <Text style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: colors.text,
          marginBottom: 20,
        }}>
          CRUD Mutations Example
        </Text>

        {/* Status Display */}
        <View style={{
          backgroundColor: colors.background,
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
          }}>
            Status
          </Text>
          <Text style={{ color: colors.text, marginBottom: 4 }}>
            Loading: {isLoading ? 'Yes' : 'No'}
          </Text>
          <Text style={{ color: colors.text, marginBottom: 4 }}>
            Error: {error ? error.message : 'None'}
          </Text>
          <Text style={{ color: colors.text, marginBottom: 4 }}>
            Total Events: {totalCount}
          </Text>
          <Text style={{ color: colors.text }}>
            Selected Event ID: {selectedEventId || 'None'}
          </Text>
        </View>

        {/* Form Fields */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 10,
          }}>
            Event Form
          </Text>
          
          <TextInput
            style={{
              backgroundColor: colors.background,
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              color: colors.text,
            }}
            placeholder="Event Title"
            placeholderTextColor={colors.textSecondary}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />
          
          <TextInput
            style={{
              backgroundColor: colors.background,
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              color: colors.text,
              height: 80,
            }}
            placeholder="Event Description"
            placeholderTextColor={colors.textSecondary}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
          />
          
          <TextInput
            style={{
              backgroundColor: colors.background,
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              color: colors.text,
            }}
            placeholder="Event Location"
            placeholderTextColor={colors.textSecondary}
            value={formData.location?.text || ''}
            onChangeText={(text) => setFormData({ 
              ...formData, 
              location: {
                text,
                city: null,
                state: null,
                coordinates: { lat: null, lng: null }
              }
            })}
          />
        </View>

        {/* Action Buttons */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 10,
          }}>
            Actions
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
                opacity: isLoading ? 0.5 : 1,
              }}
              onPress={handleCreateEvent}
              disabled={isLoading}
            >
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                Create Event
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
                opacity: isLoading ? 0.5 : 1,
              }}
              onPress={handleUpdateEvent}
              disabled={isLoading}
            >
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                Update Event
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
                opacity: isLoading ? 0.5 : 1,
              }}
              onPress={handleDeleteEvent}
              disabled={isLoading}
            >
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                Delete Event
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
                opacity: isLoading ? 0.5 : 1,
              }}
              onPress={handleJoinEvent}
              disabled={isLoading}
            >
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                Join Event
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
                opacity: isLoading ? 0.5 : 1,
              }}
              onPress={handleLeaveEvent}
              disabled={isLoading}
            >
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                Leave Event
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleResetAll}
            >
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                Reset All
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Events List */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 10,
          }}>
            Your Events ({events.length})
          </Text>
          
          {events.length === 0 ? (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>
              No events found. Create one above!
            </Text>
          ) : (
            events.slice(0, 5).map((event) => (
              <TouchableOpacity
                key={event._id}
                style={{
                  backgroundColor: selectedEventId === event._id ? colors.background : colors.background,
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: selectedEventId === event._id ? colors.background : colors.border,
                }}
                onPress={() => setSelectedEventId(event._id || '')}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: selectedEventId === event._id ? colors.text : colors.text,
                  marginBottom: 4,
                }}>
                  {event.title}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: selectedEventId === event._id ? colors.text : colors.textSecondary,
                  marginBottom: 4,
                }}>
                  📍 {typeof event.location === 'string' ? event.location : event.location.text}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: selectedEventId === event._id ? colors.text : colors.textSecondary,
                }}>
                  📅 {new Date(event.start_time || new Date()).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))
          )}
          
          {events.length > 5 && (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 10 }}>
              ... and {events.length - 5} more events
            </Text>
          )}
        </View>

        {/* Debug Information */}
        <View style={{
          backgroundColor: colors.background,
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
          }}>
            Debug Information
          </Text>
          <Text style={{ color: colors.text, fontSize: 12, marginBottom: 4 }}>
            User ID: {userId}
          </Text>
          <Text style={{ color: colors.text, fontSize: 12, marginBottom: 4 }}>
            Events in cache: {events.length}
          </Text>
          <Text style={{ color: colors.text, fontSize: 12, marginBottom: 4 }}>
            Mutations loading: {isLoading ? 'Yes' : 'No'}
          </Text>
          <Text style={{ color: colors.text, fontSize: 12 }}>
            Last error: {error ? error.message : 'None'}
          </Text>
        </View>

        {/* Tips */}
        <View style={{
          backgroundColor: colors.background,
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
          }}>
            💡 Tips
          </Text>
          <Text style={{ color: colors.text, fontSize: 14, marginBottom: 4 }}>
            • Fill out the form and click "Create Event" to see optimistic updates
          </Text>
          <Text style={{ color: colors.text, fontSize: 14, marginBottom: 4 }}>
            • Select an event from the list to update, delete, join, or leave
          </Text>
          <Text style={{ color: colors.text, fontSize: 14, marginBottom: 4 }}>
            • Watch the cache update in real-time with optimistic updates
          </Text>
          <Text style={{ color: colors.text, fontSize: 14 }}>
            • Check the console for detailed mutation logs
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default CrudMutationsExample;