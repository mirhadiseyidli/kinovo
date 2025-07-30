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
import type { CreateEventTabParamList, AttendeeFriend } from '@/types/allTypes';

interface SuggestionsData {
  friends: AttendeeFriend[];
  nonFriends: AttendeeFriend[];
  tags: {
    activity_name: string;
    friends: AttendeeFriend[];
  }[];
}
import { useCreateEventContext } from '@/context/CreateEventContext';
import { useUpdateEventMutation } from '@/hooks/useCreateEventMutation';
import { format } from 'date-fns';
import DefaultProfilePicture from '@/components/DefaultProfilePicture';
import { CreateEventScrollContext } from '@/context/CreateEventScrollContext';
import Animated, { useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

const AnimatedScrollView = Animated.createAnimatedComponent(Animated.ScrollView);

export default React.memo(function EventAttendeesAndOptions() {
  const navigation = useNavigation<NavigationProp<CreateEventTabParamList>>();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [limit, setLimit] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<AttendeeFriend[]>([]);
  const [suggestionsData, setSuggestionsData] = useState<SuggestionsData>({ friends: [], nonFriends: [], tags: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionSelectRef = useRef<((item: any) => void) | null>(null);
  const updateEventMutation = useUpdateEventMutation();
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
          onPress: () => saveEvent('all_instances'),
          style: 'default',
        },
        {
          text: 'Cancel',
          style: 'destructive',
        },
      ]
    );
  };

  const saveEvent = async (recurringOption?: 'this_only' | 'all_instances') => {
    if (isEditMode && eventId && recurringOption) {
      // Handle recurring event update with the selected option
      setLoading(true);
      setError(null);
      
      try {
        const eventData = compileEventData();
        const response = await updateEventMutation.mutateAsync({
          eventId,
          updates: eventData,
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
      {/* Backdrop overlay - split to avoid covering input field */}
      {showSuggestions && (
        <>
          {/* Top overlay - above input field */}
          <Pressable
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 116, // Options component height + gap
              backgroundColor: 'transparent',
              zIndex: 999,
            }}
            onPress={handleBackdropPress}
          />
          {/* Bottom overlay - below dropdown */}
          <Pressable
            style={{
              position: 'absolute',
              top: 484, // Start after dropdown area
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'transparent',
              zIndex: 999,
            }}
            onPress={handleBackdropPress}
          />
          {/* Side overlays - left and right of dropdown */}
          <Pressable
            style={{
              position: 'absolute',
              top: 116,
              left: 0,
              width: 16,
              height: 368,
              backgroundColor: 'transparent',
              zIndex: 999,
            }}
            onPress={handleBackdropPress}
          />
          <Pressable
            style={{
              position: 'absolute',
              top: 116,
              right: 0,
              width: 16,
              height: 368,
              backgroundColor: 'transparent',
              zIndex: 999,
            }}
            onPress={handleBackdropPress}
          />
        </>
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

      {/* Friends Suggestions Dropdown - Rendered outside ScrollView */}
      {showSuggestions && (suggestionsData.friends.length > 0 || suggestionsData.nonFriends.length > 0 || suggestionsData.tags.length > 0) && (
        <ThemedView style={{
          position: 'absolute',
          top: 180, // Options (≈60px) + gap (16px) + Attendees input (≈44px) + spacing (4px) + padding
          left: 16,
          right: 16,
          backgroundColor: themeColors.inputBackgroundColor,
          borderWidth: 1,
          borderColor: themeColors.border,
          borderRadius: 8,
          maxHeight: 300,
          zIndex: 1000,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <ScrollView 
            style={{ maxHeight: 300 }} 
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            {suggestionsData.friends.length > 0 && (
              <>
                <View style={{ 
                  paddingHorizontal: 16, 
                  paddingVertical: 12, 
                  borderBottomWidth: 1, 
                  borderBottomColor: themeColors.border 
                }}>
                  <Text style={{ 
                    fontWeight: 'bold', 
                    fontSize: 14, 
                    color: themeColors.text,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    Friends
                  </Text>
                </View>
                {suggestionsData.friends.map((friend, index) => (
                  <TouchableOpacity
                    key={friend._id}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: index !== suggestionsData.friends.length - 1 || suggestionsData.nonFriends.length > 0 ? 1 : 0,
                      borderBottomColor: themeColors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => handleSuggestionSelect(friend)}
                  >
                    <View style={{ marginRight: 12 }}>
                      <DefaultProfilePicture
                        profilePicture={friend.profile_picture}
                        fullName={friend.full_name}
                        size={40}
                        borderRadius={20}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontWeight: '600', 
                        fontSize: 16, 
                        color: themeColors.text 
                      }}>
                        {friend.full_name}
                      </Text>
                      <Text style={{ 
                        fontSize: 14, 
                        color: themeColors.placeholderTextColor 
                      }}>
                        @{friend.username}
                      </Text>
                    </View>
                    <Feather 
                      name="user-plus" 
                      size={16} 
                      color={themeColors.placeholderTextColor} 
                    />
                  </TouchableOpacity>
                ))}
              </>
            )}
            
            {suggestionsData.nonFriends.length > 0 && (
              <>
                <View style={{ 
                  paddingHorizontal: 16, 
                  paddingVertical: 12, 
                  borderBottomWidth: 1, 
                  borderBottomColor: themeColors.border 
                }}>
                  <Text style={{ 
                    fontWeight: 'bold', 
                    fontSize: 14, 
                    color: themeColors.text,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    Users
                  </Text>
                </View>
                {suggestionsData.nonFriends.map((user, index) => (
                  <TouchableOpacity
                    key={user._id}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: index !== suggestionsData.nonFriends.length - 1 || suggestionsData.tags.length > 0 ? 1 : 0,
                      borderBottomColor: themeColors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => handleSuggestionSelect(user)}
                  >
                    <View style={{ marginRight: 12 }}>
                      <DefaultProfilePicture
                        profilePicture={user.profile_picture}
                        fullName={user.full_name}
                        size={40}
                        borderRadius={20}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontWeight: '600', 
                        fontSize: 16, 
                        color: themeColors.text 
                      }}>
                        {user.full_name}
                      </Text>
                      <Text style={{ 
                        fontSize: 14, 
                        color: themeColors.placeholderTextColor 
                      }}>
                        @{user.username}
                      </Text>
                    </View>
                    <Feather 
                      name="user-plus" 
                      size={16} 
                      color={themeColors.placeholderTextColor} 
                    />
                  </TouchableOpacity>
                ))}
              </>
            )}
            
            {suggestionsData.tags.length > 0 && (
              <>
                <View style={{ 
                  paddingHorizontal: 16, 
                  paddingVertical: 12, 
                  borderBottomWidth: 1, 
                  borderBottomColor: themeColors.border 
                }}>
                  <Text style={{ 
                    fontWeight: 'bold', 
                    fontSize: 14, 
                    color: themeColors.text,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    Tags
                  </Text>
                </View>
                {suggestionsData.tags.map((tag, index) => (
                  <TouchableOpacity
                    key={tag.activity_name}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: index !== suggestionsData.tags.length - 1 ? 1 : 0,
                      borderBottomColor: themeColors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => handleSuggestionSelect(tag)}
                  >
                    <View style={{ 
                      marginRight: 12,
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: themeColors.inputBackgroundColor,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MaterialCommunityIcons 
                        name={getCategoryIcon(tag.activity_name)} 
                        size={24} 
                        color={getCategoryColor(tag.activity_name)} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontWeight: '600', 
                        fontSize: 16, 
                        color: themeColors.text 
                      }}>
                        {tag.activity_name}
                      </Text>
                      <Text style={{ 
                        fontSize: 14, 
                        color: themeColors.placeholderTextColor 
                      }}>
                        {tag.friends.length} {tag.friends.length === 1 ? 'person' : 'people'}
                      </Text>
                    </View>
                    <Feather 
                      name="users" 
                      size={16} 
                      color={themeColors.placeholderTextColor} 
                    />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </ThemedView>
      )}
    </ThemedView>
  );
})