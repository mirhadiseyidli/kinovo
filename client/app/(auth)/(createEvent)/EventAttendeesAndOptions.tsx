import { ThemedView } from '@/components/ThemedView';
import Attendees from '@/components/CreateEvent/Attendees';
import Options from '@/components/CreateEvent/Options';
import { ButtonWithLabel } from '@/components/ButtonWithLabel';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import React, { useState, useRef, useContext } from 'react';
import { ScrollView, View, Text, ActivityIndicator, Alert, TouchableOpacity, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';
import FriendSuggestionsDropdown from '@/components/CreateEvent/FriendSuggestionsDropdown';
import type { CreateEventTabParamList, AttendeeFriend } from '@/types/allTypes';
import { useCreateEventContext } from '@/context/CreateEventContext';
import { useUpdateEvent } from '@/hooks/useNewEventMutations';
import { format } from 'date-fns';
import DefaultProfilePicture from '@/components/DefaultProfilePicture';
import { CreateEventScrollContext } from '@/context/CreateEventScrollContext';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { useRouter } from 'expo-router';

interface SuggestionsData {
  friends: AttendeeFriend[];
  nonFriends: AttendeeFriend[];
  tags: {
    activity_name: string;
    friends: AttendeeFriend[];
  }[];
}

const AnimatedScrollView = Animated.createAnimatedComponent(Animated.ScrollView);

export default React.memo(function EventAttendeesAndOptions() {
  const navigation = useNavigation<NavigationProp<CreateEventTabParamList>>();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [limit, setLimit] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<AttendeeFriend[]>([]);
  const [suggestionsData, setSuggestionsData] = useState<SuggestionsData>({ friends: [], nonFriends: [], tags: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputPosition, setInputPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const suggestionSelectRef = useRef<((item: any) => void) | null>(null);
  const updateEventMutation = useUpdateEvent();
  const router = useRouter();
  const { bounceCompleted, wasDraggingAtTop, isDismissing, handleDismiss } = useContext(CreateEventScrollContext);
  const { 
    validationErrors, 
    loading,
    setLoading,
    error, 
    setError,
    createOrUpdateEvent,
    isEditMode,
    eventId,
    title,
    recurrence,
    originalRecurrenceChecked,
    compileEventData,
    resetEventForm,
    startTime
  } = useCreateEventContext();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (isDismissing.value) return;
      
      const currentY = event.contentOffset.y;

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

  const handleSaveEvent = async () => {
    // If we're editing a recurring event that was originally recurring, show the alert instead of saving directly
    if (isEditMode && originalRecurrenceChecked && recurrence.frequency && recurrence.frequency !== 'none') {
      showRecurringEventAlert();
    } else {
      // For non-recurring events or new events, use the normal flow
      await saveEvent();
    }
  };

  const showRecurringEventAlert = () => {
    if (!startTime) return;
    
    const formattedDate = format(startTime, 'MMMM d, yyyy');
    
    Alert.alert(
      'Recurring Event',
      `"${title}" is a recurring event. Which occurrences would you like to edit?`,
      [
        {
          text: `This Occurrence Only (${formattedDate})`,
          onPress: () => saveEvent('this_only'),
          style: 'default',
        },
        {
          text: 'All Occurrences',
          onPress: () => saveEvent('all_future'),
          style: 'default',
        },
        {
          text: 'Cancel',
          style: 'destructive',
        },
      ]
    );
  };

  const saveEvent = async (recurringOption?: 'this_only' | 'all_future') => {
    if (isEditMode && eventId && recurringOption) {
      // Handle recurring event update with the selected option
      setLoading(true);
      setError(null);
      
      try {
        const eventData = compileEventData();
        const response = await updateEventMutation.mutateAsync({
          eventId: eventId,
          ...eventData,
          occurrenceDate: startTime!,
          modifyType: recurringOption
        });
        
        if (response?.success) {
          resetEventForm();
          navigation.getParent()?.goBack(); // This will close the modal
          Alert.alert(
            'Success', 
            'Event Changes Saved'
          );
        }
        
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to update event');
        setLoading(false);
      }
    } else {
      // Normal flow - create new event or update non-recurring event
      const response = await createOrUpdateEvent();
      
      if (response?.success) {
        navigation.getParent()?.goBack(); // This will close the modal
        Alert.alert(
          'Success', 
          isEditMode ? 'Event Changes Saved' : 'Event Created!'
        );
      } else if (Object.keys(validationErrors).length > 0) {
        // Show first validation error
        const firstError = Object.values(validationErrors).find(error => error);
        if (firstError) {
          Alert.alert('Validation Error', firstError);
        }
      } else if (error) {
        Alert.alert('Error', error || 'An unknown error occurred');
      }
    }
  };

  const navigateToBack = () => {
    navigation.navigate('Date & Location');
  };

  const handleSuggestionSelect = (item: any) => {
    // Call the actual suggestion selection logic from the Attendees component
    if (suggestionSelectRef.current) {
      suggestionSelectRef.current(item);
    }
  };

  const handleBackdropPress = () => {
    setShowSuggestions(false);
  };

  return (
    <ThemedView style={{ flex: 1, width: '100%', paddingHorizontal: 16 }}>
      {/* Full screen backdrop when suggestions are showing */}
      {showSuggestions && inputPosition && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            zIndex: 999,
          }}
          onPress={handleBackdropPress}
        />
      )}

      <AnimatedScrollView 
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps={'always'}
        contentContainerStyle={{ gap: 16 }}
        scrollEnabled={!showSuggestions}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        bounces={true}
      >
        {/* Step 3: Attendees & Options */}
        <Options setLimit={setLimit}/>
        <Attendees 
          limit={limit}
          suggestions={suggestions}
          setSuggestions={setSuggestions}
          suggestionsData={suggestionsData}
          setSuggestionsData={setSuggestionsData}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          onSuggestionSelectRef={suggestionSelectRef}
          onInputPositionChange={setInputPosition}
        />

        {/* Error message if any */}
        {error && (
          <View style={{ 
            backgroundColor: '#FFEBEE', 
            padding: 10, 
            borderRadius: 8, 
            marginTop: 10 
          }}>
            <Text style={{ color: '#C62828' }}>{error}</Text>
          </View>
        )}

        {/* Back and Next Buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <ButtonWithLabel 
            label="Back"
            onPress={navigateToBack}
            containerStyle={{ 
              backgroundColor: themeColors.inputBackgroundColor,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              alignSelf: 'flex-start',
              zIndex: -1
            }}
            textStyle={{
              fontWeight: 'bold',
              color: themeColors.text
            }}
          />
          <ButtonWithLabel 
            label={loading ? "" : isEditMode ? "Save Event" : "Create Event"}
            onPress={handleSaveEvent}
            disabled={loading}
            containerStyle={{ 
              backgroundColor: themeColors.mountainGreen,
              paddingVertical: 10,
              paddingHorizontal: loading ? 30 : 16,
              borderRadius: 8,
              alignSelf: 'flex-end',
              opacity: loading ? 0.7 : 1
            }}
            textStyle={{
              fontWeight: 'bold',
              color: 'white'
            }}
          >
            {loading && (
              <ActivityIndicator 
                size="small" 
                color={themeColors.text} 
                style={{ marginRight: 8 }} 
              />
            )}
          </ButtonWithLabel>
        </View>
      </AnimatedScrollView>

      {/* Friends Suggestions Dropdown - Positioned based on input location */}
      {showSuggestions && (suggestionsData.friends.length > 0 || suggestionsData.nonFriends.length > 0 || suggestionsData.tags.length > 0) && inputPosition && (
        <FriendSuggestionsDropdown
          suggestionsData={suggestionsData}
          showSuggestions={showSuggestions}
          onSuggestionSelect={handleSuggestionSelect}
          inputPosition={inputPosition}
        />
      )}
    </ThemedView>
  );
})