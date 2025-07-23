import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { 
  useAdvancedEventMutation, 
  useBatchEventMutations, 
  useEventAttendanceMutation,
  useEventMutationUI
} from '@/hooks/useTypedMutations';
import { Event } from '@/types/allTypes';

/**
 * Example component demonstrating the typed mutation factory
 * 
 * This component shows how to use:
 * - Discriminated union types for mutation states
 * - Optimistic updates with automatic rollback
 * - Type-safe error handling
 * - Batch operations
 * - Real-time UI state management
 */

export const TypedMutationExample: React.FC = () => {
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Example 1: Advanced event creation with validation
  const advancedMutation = useAdvancedEventMutation();
  
  // Example 2: Batch operations
  const batchMutations = useBatchEventMutations();
  
  // Example 3: Event attendance
  const attendanceMutation = useEventAttendanceMutation();
  
  // Example 4: UI state management
  const uiMutations = useEventMutationUI();

  // Handle single event creation
  const handleCreateEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    try {
      const eventData: Partial<Event> = {
        title: eventTitle,
        description: eventDescription,
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        end_time: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        location: {
          text: 'Sample Location',
          city: 'Sample City',
          state: 'Sample State',
          coordinates: {
            lat: 0,
            lng: 0,
          },
        },
        category: 'other',
        visibility: 'public',
      };

      await advancedMutation.createEvent(eventData);
      
      // Success handling
      if (advancedMutation.isSuccess && advancedMutation.data) {
        Alert.alert('Success', `Event "${advancedMutation.data.title}" created!`);
        setEventTitle('');
        setEventDescription('');
      }
    } catch (error) {
      // Error handling
      if (advancedMutation.isError && advancedMutation.error) {
        Alert.alert('Error', advancedMutation.error.message);
      }
    }
  };

  // Handle batch event creation
  const handleBatchCreate = async () => {
    const events: Partial<Event>[] = [
      {
        title: 'Batch Event 1',
        description: 'First batch event',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 25 * 60 * 60 * 1000),
        category: 'work',
      },
      {
        title: 'Batch Event 2',
        description: 'Second batch event',
        start_time: new Date(Date.now() + 48 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 49 * 60 * 60 * 1000),
        category: 'personal',
      },
    ];

    const results = await batchMutations.createMultipleEvents(events);
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    Alert.alert(
      'Batch Creation Complete',
      `${successCount} events created successfully, ${errorCount} failed`
    );
  };

  // Handle attendance toggle
  const handleToggleAttendance = async (eventId: string, currentlyAttending: boolean) => {
    try {
      await attendanceMutation.mutateAsync({
        eventId,
        action: currentlyAttending ? 'leave' : 'join',
      });
      
      if (attendanceMutation.isSuccess) {
        Alert.alert(
          'Success',
          `${currentlyAttending ? 'Left' : 'Joined'} event successfully`
        );
      }
    } catch (error) {
      if (attendanceMutation.isError) {
        Alert.alert('Error', 'Failed to update attendance');
      }
    }
  };

  // Render mutation state indicator
  const renderMutationState = (state: any, title: string) => {
    const getStateColor = () => {
      switch (state.type) {
        case 'loading': return '#2196F3';
        case 'success': return '#4CAF50';
        case 'error': return '#F44336';
        default: return '#666';
      }
    };

    const getStateText = () => {
      switch (state.type) {
        case 'loading': return 'Loading...';
        case 'success': return 'Success!';
        case 'error': return 'Error occurred';
        default: return 'Idle';
      }
    };

    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 8,
        padding: 8,
        borderRadius: 4,
        backgroundColor: '#f5f5f5'
      }}>
        <View style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: getStateColor(),
          marginRight: 8,
        }} />
        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{title}:</Text>
        <Text style={{ fontSize: 14, marginLeft: 4, color: getStateColor() }}>
          {getStateText()}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Typed Mutation Factory Demo
      </Text>

      {/* Example 1: Advanced Event Creation */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
          1. Advanced Event Creation
        </Text>
        
        {renderMutationState({ type: 'idle' }, 'Creation State')}
        
        {/* State information */}
        <View style={{ 
          backgroundColor: '#f8f9fa', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16 
        }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
            State Info:
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Mutation available: Yes
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Raw mutation status: {advancedMutation.rawMutation.status}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Pending: {advancedMutation.rawMutation.isPending ? 'Yes' : 'No'}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Error: {advancedMutation.rawMutation.isError ? 'Yes' : 'No'}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Success: {advancedMutation.rawMutation.isSuccess ? 'Yes' : 'No'}
          </Text>
        </View>

        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
          placeholder="Event Title"
          value={eventTitle}
          onChangeText={setEventTitle}
        />
        
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            minHeight: 80,
          }}
          placeholder="Event Description"
          value={eventDescription}
          onChangeText={setEventDescription}
          multiline
        />
        
        <TouchableOpacity
          style={{
            backgroundColor: advancedMutation.rawMutation.isPending ? '#ccc' : '#2196F3',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 8,
          }}
          onPress={handleCreateEvent}
          disabled={advancedMutation.rawMutation.isPending}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            {advancedMutation.rawMutation.isPending ? 'Creating...' : 'Create Event'}
          </Text>
        </TouchableOpacity>
        
        {advancedMutation.rawMutation.isError && (
          <TouchableOpacity
            style={{
              backgroundColor: '#FF9800',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={() => advancedMutation.reset()}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
              Reset & Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Example 2: Batch Operations */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
          2. Batch Operations
        </Text>
        
        {renderMutationState({ type: 'idle' }, 'Batch Create')}
        
        {/* Combined state information */}
        <View style={{ 
          backgroundColor: '#f8f9fa', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16 
        }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
            Combined State:
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Any Loading: {batchMutations.combinedState.isLoading ? 'Yes' : 'No'}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Has Errors: {batchMutations.combinedState.hasError ? 'Yes' : 'No'}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            All Success: {batchMutations.combinedState.allSuccess ? 'Yes' : 'No'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={{
            backgroundColor: batchMutations.combinedState.isLoading ? '#ccc' : '#4CAF50',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 8,
          }}
          onPress={handleBatchCreate}
          disabled={batchMutations.combinedState.isLoading}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            {batchMutations.combinedState.isLoading ? 'Creating Batch...' : 'Create Batch Events'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            backgroundColor: '#666',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={batchMutations.resetAll}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            Reset All Batch States
          </Text>
        </TouchableOpacity>
      </View>

      {/* Example 3: Event Attendance */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
          3. Event Attendance
        </Text>
        
        {renderMutationState({ type: attendanceMutation.isPending ? 'loading' : attendanceMutation.isError ? 'error' : attendanceMutation.isSuccess ? 'success' : 'idle' }, 'Attendance')}
        
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
          placeholder="Event ID"
          value={selectedEventId}
          onChangeText={setSelectedEventId}
        />
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#4CAF50',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={() => handleToggleAttendance(selectedEventId, false)}
            disabled={attendanceMutation.isPending || !selectedEventId}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
              Join Event
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#F44336',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={() => handleToggleAttendance(selectedEventId, true)}
            disabled={attendanceMutation.isPending || !selectedEventId}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
              Leave Event
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Example 4: UI State Management */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
          4. UI State Management
        </Text>
        
        <View style={{ 
          backgroundColor: '#f8f9fa', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16 
        }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
            Global UI State:
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Loading: {uiMutations.isLoading ? 'Yes' : 'No'} ({uiMutations.loadingCount})
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Errors: {uiMutations.hasErrors ? 'Yes' : 'No'} ({uiMutations.errorCount})
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Success: {uiMutations.hasSuccess ? 'Yes' : 'No'} ({uiMutations.successCount})
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Can Retry: {uiMutations.hasErrors ? 'Yes' : 'No'}
          </Text>
          
          {uiMutations.loadingMessage && (
            <Text style={{ fontSize: 12, color: '#2196F3', marginTop: 4 }}>
              {uiMutations.loadingMessage}
            </Text>
          )}
          
          {uiMutations.errorMessage && (
            <Text style={{ fontSize: 12, color: '#F44336', marginTop: 4 }}>
              {uiMutations.errorMessage}
            </Text>
          )}
          
          {uiMutations.successMessage && (
            <Text style={{ fontSize: 12, color: '#4CAF50', marginTop: 4 }}>
              {uiMutations.successMessage}
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={{
            backgroundColor: '#666',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={uiMutations.resetAll}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            Reset All UI States
          </Text>
        </TouchableOpacity>
      </View>

      {/* Performance Info */}
      <View style={{ 
        backgroundColor: '#e8f5e8', 
        padding: 16, 
        borderRadius: 8, 
        marginBottom: 32 
      }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
          🚀 Performance Benefits
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
          • Type-safe mutations with discriminated unions
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
          • Optimistic updates with automatic rollback
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
          • Offline-first mutation queueing
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
          • Batch operations with individual error handling
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>
          • Real-time UI state management
        </Text>
      </View>
    </ScrollView>
  );
};

export default TypedMutationExample;