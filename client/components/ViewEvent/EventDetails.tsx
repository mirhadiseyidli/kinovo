import React, { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActionSheetIOS, Platform, type ViewStyle, Alert, InteractionManager } from 'react-native';
import { format, isSameDay, isTomorrow } from 'date-fns';
import type { ReportEventButtonProps, Coordinates, EventProp } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import EventAttendees from './EventAttendees';
import EventCreationDetails from './EventCreationDetails';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventStatusActionButtons from './EventStatusActionButtons';
import ExpandableDescription from './EventDescription';
import ReportEventButton from './ReportEventButton';
import EventTitleAndCategory from './EventTitleAndCategory';
import EventTimeAndDate from './EventTimeAndDate';
import EventRecurrence from './EventRecurrence';
import EventLocationInfo from './EventLocationInfo';
import EventVisibilityInfo from './EventVisibilityInfo';
import { useRespondToInvitation, useJoinEvent } from '@/hooks/useNewEventMutations';
import { useNotInterestedEvent, useCancelEvent } from '@/hooks/useSpecialMutations';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { jwtDecode } from 'jwt-decode';
import { useEventReport } from '@/hooks/useEventReport';
import { useViewEventModal } from '@/context/ViewEventModalContext';

/**
 * EventDetails - MIGRATED to New TanStack Query Architecture
 * 
 * Migration changes:
 * - useEventMutations → individual mutation hooks from new architecture
 * - Changed from async/await pattern to callback-based mutation pattern
 * - Direct cache updates instead of invalidation
 * - Added proper success/error handling with mutation callbacks
 * - Supports recurring event modifications
 */

const EventDetailsSection: React.FC<EventProp & { 
  isRecurringOccurrence: boolean | undefined, 
  occurrence_start: Date | null,
  setNewEventToView?: Dispatch<SetStateAction<string>>,
}> = ({ event, isRecurringOccurrence, occurrence_start, setNewEventToView }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { showModal } = useViewEventModal();

  // New TanStack Query mutations
  const respondToInvitationMutation = useRespondToInvitation();
  const joinEventMutation = useJoinEvent();
  const markNotInterestedMutation = useNotInterestedEvent();
  const cancelEventMutation = useCancelEvent();
  const { accessToken } = useAuthSession();
  const router = useRouter();
  const loggedInUserId = accessToken?.current ? (jwtDecode(accessToken.current) as any)?._id : null;
  const { reportEvent: reportEventApi } = useEventReport();

  // Check if event is in the past
  const isEventInPast = useMemo(() => {
    if (!event.end_time) return false;
    const eventEndTime = new Date(event.end_time);
    return eventEndTime < new Date();
  }, [event.end_time]);

  const formatDateTime = (date: Date | null) =>
    date ? format(new Date(date), 'MMMM d, yyyy, h:mm a') : 'Unknown';

  const formatTimeOnly = (date: Date | null) =>
    date ? format(new Date(date), 'h:mm a') : 'Unknown';

  const isEventTomorrow = event.start_time ? isTomorrow(new Date(event.start_time)) : false;

  const startLabel = event.start_time
    ? isEventTomorrow
      ? `Tomorrow, ${formatTimeOnly(event.start_time)}`
      : formatDateTime(event.start_time)
    : 'Start time unknown';

  const endLabel = event.end_time
    ? isEventTomorrow && isSameDay(new Date(event.start_time!), new Date(event.end_time))
      ? `to Tomorrow, ${formatTimeOnly(event.end_time)}`
      : formatDateTime(event.end_time)
    : 'End time unknown';

  const handleInvitationResponse = useCallback((status: 'accepted' | 'maybe' | 'rejected', options?: { modifyType: 'this_only' | 'all_future' }) => {
    if (!event._id) return;
    
    const variables: any = {
      eventId: event._id,
      status
    };
    
    // If this is a recurring occurrence and we have options, include them
    if (event.isRecurringOccurrence && options?.modifyType && event.start_time) {
      variables.occurrenceDate = event.start_time;
      variables.modifyType = options.modifyType;
    }
    
    respondToInvitationMutation.mutate(variables, {
      onSuccess: () => {
        // Direct cache update handled automatically by new architecture
        
        // Close the event view after successful response
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      },
      onError: (error) => {
        console.error('Failed to respond to invitation:', error);
        Alert.alert('Error', 'Failed to update response. Please try again.');
      }
    });
  }, [event, respondToInvitationMutation]);

  const handleJoinEvent = useCallback((status: 'accepted' | 'maybe', options?: { modifyType: 'this_only' | 'all_future' }) => {
    if (!event._id) return;

    const variables: any = {
      eventId: event._id,
      status
    };

    // If this is a recurring occurrence and we have options, include them
    if (event.isRecurringOccurrence && options?.modifyType && event.start_time) {
      variables.occurrenceDate = event.start_time;
      variables.modifyType = options.modifyType;
    }
    
    joinEventMutation.mutate(variables, {
      onSuccess: () => {
        // Direct cache update handled automatically by new architecture
        // Optional: Show success message
      },
      onError: (error) => {
        console.error('Failed to join event:', error);
        Alert.alert('Error', 'Failed to join event. Please try again.');
      }
    });
  }, [event, joinEventMutation]);

  const handleStatusChange = useCallback((status: 'accepted' | 'maybe' | 'rejected') => {
    // Check if the user is invited to this event
    const isInvited = event.attendees?.some(att => att.user._id === loggedInUserId);

    // If not invited and trying to join, use the join endpoint
    if (!isInvited && (status === 'accepted' || status === 'maybe')) {
      handleJoinEvent(status);
      return;
    }

    if (isRecurringOccurrence) {
      showModal('status_change_recurring', { 
        status, 
        onConfirm: handleInvitationResponse 
      });
    } else {
      handleInvitationResponse(status);
    }
  }, [isRecurringOccurrence, handleInvitationResponse, event.attendees, loggedInUserId, handleJoinEvent, showModal]);

  const handleNotInterested = useCallback(() => {
    if (!event._id) return;
    
    markNotInterestedMutation.mutate(event._id, {
      onSuccess: () => {
        // Direct cache update handled automatically by new architecture
        showModal('not_interested_success', { message: 'Event marked as not interested.' });
      },
      onError: (error) => {
        console.error('Failed to mark event as not interested:', error);
        Alert.alert('Error', 'Failed to mark as not interested. Please try again.');
      }
    });
  }, [event, markNotInterestedMutation, showModal]);

  const acceptInvitation = useCallback(() => {
    handleStatusChange('accepted');
  }, [handleStatusChange]);

  const maybeInvitation = useCallback(() => {
    handleStatusChange('maybe');
  }, [handleStatusChange]);

  const declineInvitation = useCallback(() => {
    // Check if the user is invited to this event
    const isInvited = event.attendees?.some(att => att.user._id === loggedInUserId);

    if (isInvited) {
      handleStatusChange('rejected');
    } else {
      // If not invited, use the Not Interested functionality
      handleNotInterested();
    }
  }, [handleStatusChange, event.attendees, loggedInUserId, handleNotInterested]);

  const editEvent = useCallback(async () => {
    // If there's an event to edit
    if (event) {
      try {
        // Store the event data in AsyncStorage
        await AsyncStorage.setItem('editingEvent', JSON.stringify(event));
        // Set a flag to indicate edit mode
        await AsyncStorage.setItem('isEditMode', 'true');
        
        // Replace the current screen instead of back + push to avoid modal conflicts
        router.replace('/(auth)/(createEvent)/EventDetails');
      } catch (error) {
        console.error("Error setting up edit mode:", error);
      }
    }
  }, [event, router]);

  const inviteToEvent = useCallback(() => {
    // Navigate to AddAttendees screen with event data
    router.push({
      pathname: '/(auth)/viewEvent/addAttendees',
      params: {
        event: JSON.stringify(event),
        occurrence_start: occurrence_start ? String(occurrence_start) : undefined,
        is_occurrence: isRecurringOccurrence ? 'true' : 'false',
        originalEventId: event._id
      }
    });
  }, [event, occurrence_start, isRecurringOccurrence, router]);


  const handleReportEvent = useCallback(async (reason: string, details?: string) => {
    if (!event._id) return;
    
    try {
      await reportEventApi(event._id, reason as any, details);
      showModal('report_success');
    } catch (error) {
      console.error('Failed to report event:', error);
    }
  }, [event._id, reportEventApi, showModal]);

  const reportEvent = useCallback(() => {
    showModal('report_confirm', { onReport: handleReportEvent });
  }, [showModal, handleReportEvent]);

  const openActionSheet = () => {
    // Use the centralized modal system instead of direct ActionSheetIOS
    reportEvent();
  };

  const handleCancelEvent = useCallback((
    options?: { modifyType?: 'this_only' | 'all_future' }
  ) => {
    if (!event._id) return;
    
    const variables: any = {
      eventId: event._id
    };
    
    // If this is a recurring occurrence and we have options, include them
    if (isRecurringOccurrence && options?.modifyType) {
      const occurrenceDate = Array.isArray(occurrence_start) ? occurrence_start[0] : occurrence_start;
      variables.occurrenceDate = occurrenceDate;
      variables.modifyType = options.modifyType;
    }
    
    cancelEventMutation.mutate(variables, {
      onSuccess: () => {
        // Direct cache update handled automatically by new architecture
        const message = options?.modifyType === 'this_only' 
            ? 'This event occurrence has been cancelled successfully.'
            : options?.modifyType === 'all_future'
            ? 'All future occurrences have been cancelled successfully.'
            : 'The event has been cancelled successfully.';

        // Show success message and navigate back
        showModal('cancel_success', { message });
      },
      onError: (error) => {
        console.error('Failed to cancel event:', error);
        Alert.alert('Error', 'Failed to cancel event. Please try again.');
      }
    });
  }, [event._id, cancelEventMutation, isRecurringOccurrence, occurrence_start, showModal]);

  const cancelEvent = useCallback(() => {
    // If this is a recurring event occurrence, show the alert to choose modification type
    if (isRecurringOccurrence) {
      showModal('cancel_confirm_recurring', { onConfirm: handleCancelEvent });
    } else {
      showModal('cancel_confirm', { onConfirm: handleCancelEvent });
    }
  }, [isRecurringOccurrence, handleCancelEvent, showModal]);

  return (
    <View style={{ flex: 1, flexDirection: 'column', gap: 16, flexShrink: 1 }}>
      <EventTitleAndCategory title={event.title} category={event.category}/>

      <EventTimeAndDate startLabel={startLabel} endLabel={endLabel} />

      {event.recurrence?.checked && (
        <EventRecurrence frequency={event.recurrence.frequency} endDate={event.recurrence.end_date} />
      )}

      <EventStatusActionButtons 
          currentUserStatus={event.userStatus ?? event.attendees?.find(att => 
            att.user?._id === loggedInUserId
          )?.status ?? null}
        onAccept={acceptInvitation}
        onMaybe={maybeInvitation}
        onDecline={declineInvitation}
        onCancel={cancelEvent}
        onEdit={editEvent}
        onInvite={inviteToEvent}
        isCreator={event.creator?._id === loggedInUserId}
          loading={respondToInvitationMutation.isPending || joinEventMutation.isPending || markNotInterestedMutation.isPending || cancelEventMutation.isPending}
        isInvited={event.attendees?.some(att => att.user._id === loggedInUserId)}
        isEventInPast={isEventInPast}
      />

      <EventLocationInfo location={event?.location} />

      <EventAttendees userId={loggedInUserId} event={event} />

      <ExpandableDescription description={event?.description} />

      <EventVisibilityInfo visibility={event.visibility} />

      <EventCreationDetails 
        event_creator={event?.creator ?? null} 
        event_creation_time={event?.created_at ?? null}
      />
      
      {loggedInUserId !== event.creator?._id && 
        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <ReportEventButton onPress={openActionSheet} themeColors={themeColors} />
        </View>
      }

    </View>
  );
};

export default React.memo(EventDetailsSection);
