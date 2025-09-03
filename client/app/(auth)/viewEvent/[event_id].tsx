import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEventByIdQuery } from '@/hooks/useSingleEvent';
import EventImage from '@/components/ViewEvent/EventImage';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import EventDetailsSection from '@/components/ViewEvent/EventDetails';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreateEventProvider } from '@/context/CreateEventContext';
import { ViewEventSkeleton } from '@/components/Skeleton';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { shareContent } from '@/utils/shareUtils';
import { Feather, Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ViewEventModalProvider } from '@/context/ViewEventModalContext';

const ShareEventButton = ({ event_id }: { event_id: string }) => {
  const { event, loading, error } = useEventByIdQuery(event_id);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const handleShare = async () => {
    try {
      if (!event?._id || !event?.title) {
        throw new Error('Event data is incomplete');
      }
      if (event.status === 'cancelled') {
        Alert.alert('Unable to Share', 'This event has been cancelled and cannot be shared.');
        return;
      }
      await shareContent('event', event._id, event.title);
    } catch (error) {
      console.error('Error sharing event:', error);
      Alert.alert('Error', 'Failed to share event. Please try again.');
    }
  };

  if (loading) {
    return <ActivityIndicator size="small" color={themeColors.text} />;
  }

  if (error || !event) {
    return null;
  }

  return (
    <TouchableOpacity onPress={handleShare}>
      <Feather name="share-2" color={themeColors.text} size={20} />
    </TouchableOpacity>
  );
};

const ViewEvent = () => {
  const { event_id, occurrence_start, occurrence_end, is_occurrence } = useLocalSearchParams();
  const id = Array.isArray(event_id) ? event_id[0] : event_id;
  const [displayedEventId, setDisplayedEventId] = useState(id);
  const { event, loading, error, refetch } = useEventByIdQuery(displayedEventId);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Animated values for scroll handling
  const scrollY = useSharedValue(0);
  const isDismissing = useSharedValue(false);
  const bounceCompleted = useSharedValue(false);
  const wasDraggingAtTop = useSharedValue(false);

  const handleDismiss = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

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


  // Create modified event for recurring occurrences
  const displayEvent = React.useMemo(() => {
    if (!event) return null;
    
    // If this is a recurring occurrence, modify the event data to show the occurrence date
    if (is_occurrence === 'true' && occurrence_start && occurrence_end) {
      const startDate = Array.isArray(occurrence_start) ? occurrence_start[0] : occurrence_start;
      const endDate = Array.isArray(occurrence_end) ? occurrence_end[0] : occurrence_end;
      
      return {
        ...event,
        start_time: new Date(startDate),
        end_time: new Date(endDate),
        isRecurringOccurrence: true,
        originalEventId: event._id
      };
    }
    
    return event;
  }, [event, is_occurrence, occurrence_start, occurrence_end]);

  // Set up the header buttons
  useEffect(() => {
    if (id) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            onPress={handleDismiss}
            style={{ alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close" size={24} color={themeColors.text} />
          </TouchableOpacity>
        ),
        headerRight: () => <ShareEventButton event_id={id} />
      });
    }
  }, [navigation, id, handleDismiss, themeColors.text]);


  // Show skeleton during loading
  if (loading) {
    return <ViewEventSkeleton />;
  }

  // Show error state for network errors
  if (error) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: themeColors.text }}>Failed to load event</Text>
      </ThemedView>
    );
  }

  // Show error state only for cases where event is not found (not network errors)
  // But first try to refetch if we haven't tried yet
  if (!displayEvent && !loading) {
    // If there's no event but no error either, try refetching once
    if (!error) {
      // Trigger a refetch to get fresh data from server
      React.useEffect(() => {
        const timer = setTimeout(() => {
          refetch();
        }, 100);
        return () => clearTimeout(timer);
      }, []);
      
      // Show loading while refetching
      return <ViewEventSkeleton />;
    }
    
    // Only show "Event not found" if we've tried fetching and got an error
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <FontAwesome name="calendar-times-o" size={64} color={themeColors.tint} style={{ marginBottom: 16 }} />
          <Text style={{ 
            color: themeColors.text, 
            fontSize: 20, 
            fontWeight: 'bold', 
            textAlign: 'center',
            marginBottom: 8 
          }}>
            Event Not Found
          </Text>
          <Text style={{ 
            color: themeColors.text, 
            fontSize: 16, 
            textAlign: 'center',
            opacity: 0.7,
            lineHeight: 24,
            marginBottom: 16
          }}>
            This event may have been deleted or you may not have access to view it.
          </Text>
        </View>
        
        <TouchableOpacity 
          style={{
            backgroundColor: themeColors.tint,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
          onPress={() => refetch()}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            Try Again
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{
            backgroundColor: themeColors.inputBackgroundColor,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={handleDismiss}
        >
          <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '600' }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Show cancelled event alert
  if (displayEvent.status === 'cancelled') {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <FontAwesome name="calendar-times-o" size={64} color={themeColors.tint} style={{ marginBottom: 16 }} />
          <Text style={{ 
            color: themeColors.text, 
            fontSize: 24, 
            fontWeight: 'bold', 
            textAlign: 'center',
            marginBottom: 8 
          }}>
            Event Cancelled
          </Text>
          <Text style={{ 
            color: themeColors.text, 
            fontSize: 16, 
            textAlign: 'center',
            opacity: 0.7,
            lineHeight: 24
          }}>
            This event has been cancelled by the organizer and is no longer available.
          </Text>
        </View>
        
        <TouchableOpacity 
          style={{
            backgroundColor: themeColors.inputBackgroundColor,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={handleDismiss}
        >
          <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '600' }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Show event details
  return (
    <CreateEventProvider>
      <ViewEventModalProvider event={displayEvent}>
        <ThemedView style={{ flex: 1 }} key={id}>
          <Animated.ScrollView
            contentContainerStyle={{
              width: '100%',
              paddingBottom: insets.bottom 
            }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            bounces={true}
            overScrollMode="always"
          >
            <View style={{ width: '100%', paddingTop: 32 }}>
              <View style={{ alignItems: 'center', borderRadius: 16, overflow: 'hidden' }}>
                <EventImage 
                  event_picture={displayEvent.event_picture ?? null} 
                  category={displayEvent.category}
                />
              </View>
            </View>
            <View style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
              <EventDetailsSection 
                event={displayEvent} 
                isRecurringOccurrence={displayEvent.isRecurringOccurrence} 
                occurrence_start={displayEvent.start_time} 
                setNewEventToView={setDisplayedEventId}
              />
            </View>
          </Animated.ScrollView>
        </ThemedView>
      </ViewEventModalProvider>
    </CreateEventProvider>
  );
};

export default ViewEvent;