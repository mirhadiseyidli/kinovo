import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActionSheetIOS, Platform, type ViewStyle, Alert } from 'react-native';
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
import { useEventInvitation } from '@/hooks/useEventInvitation';
import { useEventContext } from '@/context/EventContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AddAttendeesModal from './AddAttendeesModal';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { jwtDecode } from 'jwt-decode';

const EventDetailsSection: React.FC<EventProp> = ({ event }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [currentUserStatus, setCurrentUserStatus] = useState<'pending' | 'maybe' | 'accepted' | 'rejected' | null>(null);
  const [showAddAttendeesModal, setShowAddAttendeesModal] = useState(false);
  
  const { respondToInvitation, cancelEvent: cancelEventAPI, loading: invitationLoading } = useEventInvitation();
  const { refreshEvents } = useEventContext();
  const { occurrence_start, is_occurrence } = useLocalSearchParams();
  const router = useRouter();
  const { accessToken } = useAuthSession();

  // Check if this is a recurring event
  const isRecurringEvent = event.recurrence?.checked && 
                          event.recurrence?.frequency && 
                          event.recurrence?.frequency !== 'none';

  // Check if this is a specific occurrence of a recurring event
  const isRecurringOccurrence = is_occurrence === 'true' && occurrence_start;

  useEffect(() => {
    const token = accessToken?.current;
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        // The token might have the ID in different fields, let's check them all
        const userId = decodedToken.userId || decodedToken.sub || decodedToken._id;
        console.log('Full decoded token:', decodedToken);
        console.log('Extracted user ID:', userId);
        setLoggedInUserId(userId);
        console.log('Event creator:', event.creator);
        console.log('Event creator ID:', event.creator?._id);
        console.log('Is creator match?', userId === event.creator?._id);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, [accessToken, event.creator?._id]);

  useEffect(() => {
    const status = event.attendees?.find(att => 
      att.user?._id === loggedInUserId
    )?.status ?? null;
    setCurrentUserStatus(status);
    console.log('Current user status:', status);
    console.log('Is creator check in render:', event.creator?._id === loggedInUserId);
  }, [event.attendees, loggedInUserId, event.creator?._id]);

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

  const handleInvitationResponse = useCallback(async (
    status: 'accepted' | 'maybe' | 'rejected',
    options?: { modifyType?: 'this_only' | 'all_future' }
  ) => {
    if (!event._id) return;
    
    try {
      const requestOptions: any = {};
      
      // If this is a recurring occurrence and we have options, include them
      if (isRecurringOccurrence && options?.modifyType) {
        const occurrenceDate = Array.isArray(occurrence_start) ? occurrence_start[0] : occurrence_start;
        requestOptions.occurrenceDate = occurrenceDate;
        requestOptions.modifyType = options.modifyType;
      }
      
      await respondToInvitation(event._id, status, Object.keys(requestOptions).length > 0 ? requestOptions : undefined);
      setCurrentUserStatus(status);
      // Refresh events to update calendar
      await refreshEvents();
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
    }
  }, [event._id, respondToInvitation, refreshEvents, isRecurringOccurrence, occurrence_start]);

  const handleStatusChange = useCallback((status: 'accepted' | 'maybe' | 'rejected') => {
    // If this is a recurring event occurrence, show the alert to choose modification type
    if (isRecurringOccurrence) {
      const statusText = status === 'accepted' ? 'accept' : status === 'maybe' ? 'mark as maybe' : 'decline';
      Alert.alert(
        'Recurring Event',
        `Do you want to ${statusText} this event only or all future events?`,
        [
          {
            text: 'This Event Only',
            onPress: () => handleInvitationResponse(status, { modifyType: 'this_only' }),
            style: 'default',
          },
          {
            text: 'All Future Events',
            onPress: () => handleInvitationResponse(status, { modifyType: 'all_future' }),
            style: 'default',
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      // For non-recurring events or original recurring events, respond directly
      handleInvitationResponse(status);
    }
  }, [isRecurringOccurrence, handleInvitationResponse]);

  const handleThisEventOnly = useCallback(() => {}, []);
  const handleAllFutureEvents = useCallback(() => {}, []);
  const handleCloseModal = useCallback(() => {}, []);

  const acceptInvitation = useCallback(() => {
    handleStatusChange('accepted');
  }, [handleStatusChange]);

  const maybeInvitation = useCallback(() => {
    handleStatusChange('maybe');
  }, [handleStatusChange]);

  const declineInvitation = useCallback(() => {
    handleStatusChange('rejected');
  }, [handleStatusChange]);

  const editEvent = useCallback(() => {
    console.log('event edited');
  }, []);

  const inviteToEvent = useCallback(() => {
    setShowAddAttendeesModal(true);
  }, []);

  const handleInviteSuccess = useCallback(() => {
    // Refresh event data after successful invite
    if (event._id) {
      refreshEvents();
    }
  }, [event._id, refreshEvents]);

  const reportEvent = useCallback(() => {
    console.log('reported the event');
  }, []);

  const openActionSheet = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Cancel Event'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 0,
        userInterfaceStyle: 'dark',
      },
      (buttonIndex) => {
        if (buttonIndex === 1) {
          reportEvent();
        }
      }
    );
  };

  const handleCancelEvent = useCallback(async (
    options?: { modifyType?: 'this_only' | 'all_future' }
  ) => {
    if (!event._id) return;
    
    try {
      const requestOptions: any = {};
      
      // If this is a recurring occurrence and we have options, include them
      if (isRecurringOccurrence && options?.modifyType) {
        const occurrenceDate = Array.isArray(occurrence_start) ? occurrence_start[0] : occurrence_start;
        requestOptions.occurrenceDate = occurrenceDate;
        requestOptions.modifyType = options.modifyType;
      }
      
      await cancelEventAPI(event._id, Object.keys(requestOptions).length > 0 ? requestOptions : undefined);
      
      // Refresh events to update calendar
      await refreshEvents();
      
      // Show success message and navigate back
      Alert.alert(
        'Event Cancelled',
        options?.modifyType === 'this_only' 
          ? 'This event occurrence has been cancelled successfully.'
          : options?.modifyType === 'all_future'
          ? 'All future occurrences have been cancelled successfully.'
          : 'The event has been cancelled successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Failed to cancel event:', error);
    }
  }, [event._id, cancelEventAPI, refreshEvents, isRecurringOccurrence, occurrence_start, router]);

  const cancelEvent = useCallback(() => {
    // If this is a recurring event occurrence, show the alert to choose modification type
    if (isRecurringOccurrence) {
      Alert.alert(
        'Recurring Event',
        'Do you want to cancel this event only or all future events?',
        [
          {
            text: 'This Event Only',
            onPress: () => handleCancelEvent({ modifyType: 'this_only' }),
            style: 'default',
          },
          {
            text: 'All Future Events',
            onPress: () => handleCancelEvent({ modifyType: 'all_future' }),
            style: 'destructive',
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      // For non-recurring events or original recurring events, show confirmation alert
      Alert.alert(
        'Cancel Event',
        'Are you sure you want to cancel this event?',
        [
          {
            text: 'Yes',
            onPress: () => handleCancelEvent(),
            style: 'destructive',
          },
          {
            text: 'No',
            style: 'cancel',
          },
        ]
      );
    }
  }, [isRecurringOccurrence, handleCancelEvent]);

  return (
    <View style={{ flexDirection: 'column', gap: 16 }}>
      <EventTitleAndCategory title={event.title} category={event.category}/>

      <EventTimeAndDate startLabel={startLabel} endLabel={endLabel} />

      {event.recurrence?.checked && (
        <EventRecurrence frequency={event.recurrence.frequency} endDate={event.recurrence.end_date} />
      )}

      <EventStatusActionButtons 
        currentUserStatus={currentUserStatus}
        onAccept={acceptInvitation}
        onMaybe={maybeInvitation}
        onDecline={declineInvitation}
        onCancel={cancelEvent}
        onEdit={editEvent}
        onInvite={inviteToEvent}
        isCreator={event.creator?._id === loggedInUserId}
        loading={invitationLoading}
        isInvited={event.attendees?.some(att => att.user._id === loggedInUserId)}
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
