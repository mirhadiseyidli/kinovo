import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useEventMutations } from '@/hooks/useEventMutations';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AddAttendeesModal from './AddAttendeesModal';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { jwtDecode } from 'jwt-decode';
import { useEventReport } from '@/hooks/useEventReport';
import { useViewEventModal } from '@/context/ViewEventModalContext';

const EventDetailsSection: React.FC<EventProp & { isRecurringOccurrence: boolean | undefined, occurrence_start: Date | null }> = ({ event, isRecurringOccurrence, occurrence_start }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [showAddAttendeesModal, setShowAddAttendeesModal] = useState(false);
  const { showModal } = useViewEventModal();

  const { respondToInvitation, joinEvent, markNotInterested, cancelEvent: cancelEventApi } = useEventMutations();
  const { accessToken, userId } = useAuthSession();
  const router = useRouter();
  const loggedInUserId = accessToken?.current ? (jwtDecode(accessToken.current) as any)?._id : null;
  const { reportEvent: reportEventApi, loading: reportLoading } = useEventReport();

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

  const handleInvitationResponse = useCallback(async (status: 'accepted' | 'maybe' | 'rejected', options?: { modifyType: 'this_only' | 'all_future' }) => {
    if (!event._id) return;
    
    try {
      const requestOptions: any = {
        eventId: event._id,
        status
      };
      
      // If this is a recurring occurrence and we have options, include them
      if (event.isRecurringOccurrence && options?.modifyType && event.start_time) {
        requestOptions.occurrenceDate = event.start_time;
        requestOptions.modifyType = options.modifyType;
      }
      
      await respondToInvitation(requestOptions);
      
      // Cache invalidation handled automatically by useEventMutations
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
    }
  }, [event, respondToInvitation, isRecurringOccurrence, occurrence_start, userId]);

  const handleJoinEvent = useCallback(async (status: 'accepted' | 'maybe') => {
    if (!event._id) return;
    
    try {
      await joinEvent({
        eventId: event._id,
        status
      });
      
      // Cache invalidation handled automatically by useEventMutations
    } catch (error) {
      console.error('Failed to join event:', error);
    }
  }, [event, joinEvent, userId]);

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

  const handleNotInterested = useCallback(async () => {
    if (!event._id) return;
    
    try {
      await markNotInterested({
        eventId: event._id
      });
      
      // Cache invalidation handled automatically by useEventMutations
      // Use the centralized navigation system instead of direct router.back()
      showModal('not_interested_success', { message: 'Event marked as not interested.' });
    } catch (error) {
      console.error('Failed to mark event as not interested:', error);
    }
  }, [event, markNotInterested, showModal, userId]);

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
    setShowAddAttendeesModal(true);
  }, []);

  const handleInviteSuccess = useCallback(() => {
    // Event data will be updated automatically through cache invalidation
    // No manual refresh needed with TanStack Query
  }, []);

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

  const handleCancelEvent = useCallback(async (
    options?: { modifyType?: 'this_only' | 'all_future' }
  ) => {
    if (!event._id) return;
    
    try {
      const requestOptions: any = {
        eventId: event._id
      };
      
      // If this is a recurring occurrence and we have options, include them
      if (isRecurringOccurrence && options?.modifyType) {
        const occurrenceDate = Array.isArray(occurrence_start) ? occurrence_start[0] : occurrence_start;
        requestOptions.occurrenceDate = occurrenceDate;
        requestOptions.modifyType = options.modifyType;
      }
      
      await cancelEventApi(requestOptions);
      
      // Cache invalidation handled automatically by useEventMutations
      
      const message = options?.modifyType === 'this_only' 
          ? 'This event occurrence has been cancelled successfully.'
          : options?.modifyType === 'all_future'
          ? 'All future occurrences have been cancelled successfully.'
          : 'The event has been cancelled successfully.';

      // Show success message and navigate back
      showModal('cancel_success', { message });
    } catch (error) {
      console.error('Failed to cancel event:', error);
    }
  }, [event._id, cancelEventApi, isRecurringOccurrence, occurrence_start, showModal]);

  const cancelEvent = useCallback(() => {
    // If this is a recurring event occurrence, show the alert to choose modification type
    if (isRecurringOccurrence) {
      showModal('cancel_confirm_recurring', { onConfirm: handleCancelEvent });
    } else {
      showModal('cancel_confirm', { onConfirm: handleCancelEvent });
    }
  }, [isRecurringOccurrence, handleCancelEvent, showModal]);

  return (
    <View style={{ flexDirection: 'column', gap: 16 }}>
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
          loading={false}
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

      <AddAttendeesModal
        visible={showAddAttendeesModal}
        onClose={() => setShowAddAttendeesModal(false)}
        event={event}
        onInviteSuccess={handleInviteSuccess}
      />
    </View>
  );
};

export default React.memo(EventDetailsSection);
