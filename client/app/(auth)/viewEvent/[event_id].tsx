import React, { useCallback, createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Alert, ActionSheetIOS, Platform, InteractionManager, NativeScrollEvent, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
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
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { shareContent } from '@/utils/shareUtils';
import { Feather } from '@expo/vector-icons';

type ViewEventModalType = 
  | 'report_confirm' 
  | 'report_reason' 
  | 'report_other'
  | 'report_success'
  | 'cancel_confirm_recurring'
  | 'cancel_confirm'
  | 'cancel_success'
  | 'status_change_recurring'
  | 'attendee_remove_confirm'
  | 'remove_attendee_recurring'
  | 'invite_recurring_confirm'
  | 'invite_error'
  | 'host_cancel_confirm'
  | 'not_interested_success';

interface ViewEventModalState {
  type: ViewEventModalType | null;
  data?: any;
}

interface ViewEventModalContextType {
  showModal: (type: ViewEventModalType, data?: any) => void;
  hideModal: () => void;
  isModalActive: boolean;
}

const ViewEventModalContext = createContext<ViewEventModalContextType | null>(null);

export const useViewEventModal = () => {
  const context = useContext(ViewEventModalContext);
  if (!context) {
    throw new Error('useViewEventModal must be used within ViewEventModalProvider');
  }
  return context;
};

const ViewEventModalProvider: React.FC<{ children: React.ReactNode; event: any }> = ({ children, event }) => {
  const [modalState, setModalState] = useState<ViewEventModalState>({ type: null });
  const [shouldNavigateBack, setShouldNavigateBack] = useState(false);
  const router = useRouter();

  const showModal = useCallback((type: ViewEventModalType, data?: any) => {
    setModalState({ type, data });
  }, []);

  const hideModal = useCallback(() => {
    setModalState({ type: null });
  }, []);

  // Handle navigation after modal dismissal
  useEffect(() => {
    if (shouldNavigateBack) {
      InteractionManager.runAfterInteractions(() => {
        if (router.canGoBack()) {
          router.back();
        }
        setShouldNavigateBack(false);
      });
    }
  }, [shouldNavigateBack, router]);

  // Centralized modal handler
  useEffect(() => {
    if (!modalState.type) return;

    const { type, data } = modalState;

    switch (type) {
      case 'status_change_recurring':
        const statusText = data.status === 'accepted' ? 'accept' : data.status === 'maybe' ? 'mark as maybe' : 'decline';
        Alert.alert(
          'Recurring Event',
          `Do you want to ${statusText} this event only or all future events?`,
          [
            { text: 'This Event Only', onPress: () => { hideModal(); data.onConfirm(data.status, { modifyType: 'this_only' }); }},
            { text: 'All Future Events', onPress: () => { hideModal(); data.onConfirm(data.status, { modifyType: 'all_future' }); }},
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
          ]
        );
        break;

      case 'cancel_confirm_recurring':
        Alert.alert('Recurring Event', 'Do you want to cancel this event only or all future events?',
          [
            { text: 'This Event Only', onPress: () => { hideModal(); data.onConfirm({ modifyType: 'this_only' }); }},
            { text: 'All Future Events', onPress: () => { hideModal(); data.onConfirm({ modifyType: 'all_future' }); }, style: 'destructive' },
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
          ]
        );
        break;
      
      case 'cancel_confirm':
        Alert.alert('Cancel Event', 'Are you sure you want to cancel this event?',
          [
            { text: 'Yes', onPress: () => { hideModal(); data.onConfirm(); }, style: 'destructive' },
            { text: 'No', style: 'cancel', onPress: hideModal },
          ]
        );
        break;

      case 'host_cancel_confirm':
        Alert.alert('Cancel Event', 'Are you sure you want to cancel the event?',
          [
            { text: 'Yes', onPress: () => { hideModal(); data.onConfirm(); }, style: 'destructive' },
            { text: 'No', style: 'cancel', onPress: hideModal },
          ]
        );
        break;
      
      case 'cancel_success':
        Alert.alert('Event Cancelled', data.message,
          [ { text: 'OK', onPress: () => { hideModal(); setShouldNavigateBack(true); }} ]
        );
        break;
      
      case 'report_confirm':
        Alert.alert('Report Event', 'Are you sure you want to report this event?',
          [
            { text: 'Yes', onPress: () => showModal('report_reason', data), style: 'destructive' },
            { text: 'No', style: 'cancel', onPress: hideModal },
          ]
        );
        break;
        
      case 'report_reason':
        Alert.alert('Report Event', 'Please select a reason for reporting this event:',
          [
            { text: 'Spam', onPress: () => { data.onReport('spam'); hideModal(); }},
            { text: 'Inappropriate Content', onPress: () => { data.onReport('inappropriate'); hideModal(); }},
            { text: 'Abuse', onPress: () => { data.onReport('abuse'); hideModal(); }},
            { text: 'False Information', onPress: () => { data.onReport('false_information'); hideModal(); }},
            { text: 'Other', onPress: () => showModal('report_other', data)},
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
          ]
        );
        break;

      case 'report_other':
        Alert.prompt('Additional Details', 'Please provide more information about why you are reporting this event:',
          [
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
            { text: 'Submit', onPress: (details) => { data.onReport('other', details); hideModal(); }}
          ],
          'plain-text'
        );
        break;
      
      case 'report_success':
        Alert.alert('Report Submitted', 'Thank you for your report. We will review it as soon as possible.',
          [ { text: 'OK', onPress: hideModal } ]
        );
        break;

      case 'attendee_remove_confirm':
        Alert.alert('Remove User', 'Are you sure you want to remove this user from the event?',
          [
            { text: 'Remove', onPress: () => { hideModal(); data.onConfirm(data.attendeeId); }, style: 'destructive' },
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
          ]
        );
        break;

      case 'remove_attendee_recurring':
        Alert.alert(
          'Recurring Event',
          `Do you want to remove ${data.attendeeName} from this event only or all future events?`,
          [
            { 
              text: 'This Event Only', 
              onPress: () => { hideModal(); data.onConfirm(data.attendeeId, { modifyType: 'this_only' }); }
            },
            { 
              text: 'All Future Events', 
              onPress: () => { hideModal(); data.onConfirm(data.attendeeId, { modifyType: 'all_future' }); },
              style: 'destructive'
            },
            { 
              text: 'Cancel', 
              style: 'cancel', 
              onPress: hideModal 
            },
          ]
        );
        break;

      case 'invite_recurring_confirm':
        Alert.alert(
          'Recurring Event',
          'Do you want to invite these friends to this event only or all future events?',
          [
            { text: 'This Event Only', onPress: () => { hideModal(); data.onConfirm({ modifyType: 'this_only' }); }},
            { text: 'All Future Events', onPress: () => { hideModal(); data.onConfirm({ modifyType: 'all_future' }); }},
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
          ]
        );
        break;

      case 'invite_error':
        Alert.alert('Error', 'Failed to invite friends. Please try again.',
          [ { text: 'OK', onPress: hideModal } ]
        );
        break;

      case 'not_interested_success':
        Alert.alert('Not Interested', data.message,
          [ { text: 'OK', onPress: () => { hideModal(); setShouldNavigateBack(true); }} ]
        );
        break;
    }
  }, [modalState, hideModal, showModal, router]);

  const contextValue: ViewEventModalContextType = {
    showModal,
    hideModal,
    isModalActive: modalState.type !== null,
  };

  return (
    <ViewEventModalContext.Provider value={contextValue}>
      {children}
    </ViewEventModalContext.Provider>
  );
};

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