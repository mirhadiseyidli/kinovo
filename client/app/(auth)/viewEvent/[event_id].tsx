import React, { useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetEventById } from '@/hooks/useGetEventById';
import EventImage from '@/components/ViewEvent/EventImage';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import EventDetailsSection from '@/components/ViewEvent/EventDetails';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { CreateEventProvider } from '@/context/CreateEventContext';
import { ViewEventSkeleton } from '@/components/Skeleton';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { shareContent } from '@/utils/shareUtils';
import { Feather } from '@expo/vector-icons';
import { useEventContext } from '@/context/UserSessionContext';
import { ViewEventModalProvider } from '@/context/ViewEventModalContext';

const ShareEventButton = ({ event_id }: { event_id: string }) => {
  const { event, loading, error } = useGetEventById(event_id);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const handleShare = async () => {
    try {
      if (!event?._id || !event?.title) {
        throw new Error('Event data is incomplete');
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
  const { event, loading, error, fetchEventById } = useGetEventById(id);
  const { subscribeToEventUpdates, unsubscribeFromEventUpdates } = useEventContext();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
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

  // Auto-recovery: retry fetching when there's an error
  useEffect(() => {
    if (error && !loading) {
      const retryTimer = setTimeout(() => {
        fetchEventById();
      }, 3000); // Retry after 3 seconds

      return () => clearTimeout(retryTimer);
    }
  }, [error, loading, fetchEventById]);

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

  // Set up the share button in the header
  useEffect(() => {
    if (id) {
      navigation.setOptions({
        headerRight: () => <ShareEventButton event_id={id} />
      });
    }
  }, [navigation, id]);

  // Subscribe to event updates when component mounts
  useEffect(() => {
    if (id) {
      subscribeToEventUpdates(id);
    }
    
    // Cleanup on unmount or when navigating away
    return () => {
      if (id) {
        unsubscribeFromEventUpdates(id);
      }
    };
  }, [id]);

  // Additional cleanup when component loses focus
  useFocusEffect(
    useCallback(() => {
      // Subscribe when focused
      if (id) {
        subscribeToEventUpdates(id);
      }
      
      // Cleanup when unfocused (navigating away)
      return () => {
        if (id) {
          unsubscribeFromEventUpdates(id);
        }
      };
    }, [id, subscribeToEventUpdates, unsubscribeFromEventUpdates])
  );

  // Show skeleton during loading or network errors (backend not responding)
  if (loading || error) {
    return <ViewEventSkeleton />;
  }

  // Show error state only for cases where event is not found (not network errors)
  if (!displayEvent) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: themeColors.text }}>Event not found</Text>
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
              <EventDetailsSection event={displayEvent} />
            </View>
          </Animated.ScrollView>
        </ThemedView>
      </ViewEventModalProvider>
    </CreateEventProvider>
  );
};

export default ViewEvent;