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
import { useCreateEventContext } from '@/context/CreateEventContext';
import { useEventReport } from '@/hooks/useEventReport';

const EventDetailsSection: React.FC<EventProp> = ({ event }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [showAddAttendeesModal, setShowAddAttendeesModal] = useState(false);
  const { respondToInvitation, joinEvent, markNotInterested, cancelEvent: cancelEventApi } = useEventInvitation();
  const { refreshEvents } = useEventContext();
  const { accessToken } = useAuthSession();
  const router = useRouter();
  const { occurrence_start, is_occurrence } = useLocalSearchParams();
  const loggedInUserId = accessToken?.current ? (jwtDecode(accessToken.current) as any)?._id : null;
  console.log('loggedInUserId', loggedInUserId);
  const isRecurringOccurrence = is_occurrence === 'true' && occurrence_start;
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
      const requestOptions: any = {};
      
      // If this is a recurring occurrence and we have options, include them
      if (isRecurringOccurrence && options?.modifyType && occurrence_start) {
        const occurrenceDate = Array.isArray(occurrence_start) ? occurrence_start[0] : occurrence_start;
        requestOptions.occurrenceDate = occurrenceDate;
        requestOptions.modifyType = options.modifyType;
      }
      
      await respondToInvitation(event._id, status, Object.keys(requestOptions).length > 0 ? requestOptions : undefined);
      // Refresh events to update calendar
      await refreshEvents();
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
    }
  }, [event._id, respondToInvitation, refreshEvents, isRecurringOccurrence, occurrence_start]);

  const handleJoinEvent = useCallback(async (status: 'accepted' | 'maybe') => {
    if (!event._id) return;
    
    try {
      await joinEvent(event._id, status);
      // Refresh events to update calendar
      await refreshEvents();
    } catch (error) {
      console.error('Failed to join event:', error);
    }
  }, [event._id, joinEvent, refreshEvents]);

  const handleStatusChange = useCallback((status: 'accepted' | 'maybe' | 'rejected') => {
    // Check if the user is invited to this event
    const isInvited = event.attendees?.some(att => att.user._id === loggedInUserId);

    // If not invited and trying to join, use the join endpoint
    if (!isInvited && (status === 'accepted' || status === 'maybe')) {
      handleJoinEvent(status);
      return;
    }

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
  }, [isRecurringOccurrence, handleInvitationResponse, event.attendees, loggedInUserId, handleJoinEvent]);

  const handleNotInterested = useCallback(async () => {
    if (!event._id) return;
    
    try {
      await markNotInterested(event._id);
      // Refresh events to update calendar
      await refreshEvents();
      // Navigate back to previous screen
      router.back();
    } catch (error) {
      console.error('Failed to mark event as not interested:', error);
    }
  }, [event._id, markNotInterested, refreshEvents, router]);

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

  const handleThisEventOnly = useCallback(() => {}, []);
  const handleAllFutureEvents = useCallback(() => {}, []);
  const handleCloseModal = useCallback(() => {}, []);

  const editEvent = useCallback(async () => {
    // If there's an event to edit
    if (event) {
      try {
        // Store the event data in AsyncStorage
        await AsyncStorage.setItem('editingEvent', JSON.stringify(event));
        // Set a flag to indicate edit mode
        await AsyncStorage.setItem('isEditMode', 'true');
        
        // First go back to close the view event screen
        router.back();
        
        // Then navigate to the create event modal after a short delay
        // This ensures the view event screen is closed first
        setTimeout(() => {
          router.push('/(auth)/(createEvent)/EventDetails');
        }, 300);
      } catch (error) {
        console.error("Error setting up edit mode:", error);
      }
    }
  }, [event, router]);

  const inviteToEvent = useCallback(() => {
    setShowAddAttendeesModal(true);
  }, []);

  const handleInviteSuccess = useCallback(() => {
    // Refresh event data after successful invite
    if (event._id) {
      refreshEvents();
    }
  }, [event._id, refreshEvents]);

  const handleReportEvent = useCallback(async (reason: string, details?: string) => {
    if (!event._id) return;
    
    try {
      await reportEventApi(event._id, reason as any, details);
      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review it as soon as possible.'
      );
    } catch (error) {
      console.error('Failed to report event:', error);
    }
  }, [event._id, reportEventApi]);

  const showReportReasonAlert = useCallback(() => {
    Alert.alert(
      'Report Event',
      'Please select a reason for reporting this event:',
      [
        {
          text: 'Spam',
          onPress: () => handleReportEvent('spam'),
        },
        {
          text: 'Inappropriate Content',
          onPress: () => handleReportEvent('inappropriate'),
        },
        {
          text: 'Abuse',
          onPress: () => handleReportEvent('abuse'),
        },
        {
          text: 'False Information',
          onPress: () => handleReportEvent('false_information'),
        },
        {
          text: 'Other',
          onPress: () => {
            // Show additional alert for details if "Other" is selected
            Alert.prompt(
              'Additional Details',
              'Please provide more information about why you are reporting this event:',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Submit',
                  onPress: (details) => handleReportEvent('other', details)
                }
              ],
              'plain-text'
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [handleReportEvent]);

  const reportEvent = useCallback(() => {
    Alert.alert(
      'Report Event',
      'Are you sure you want to report this event?',
      [
        {
          text: 'Yes',
          onPress: showReportReasonAlert,
          style: 'destructive',
        },
        {
          text: 'No',
          style: 'cancel',
        },
      ]
    );
  }, [showReportReasonAlert]);

  const openActionSheet = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Report Event'],
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
    } else {
      // For Android, directly show the report alert
      reportEvent();
    }
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
      
      await cancelEventApi(event._id, Object.keys(requestOptions).length > 0 ? requestOptions : undefined);
      
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
  }, [event._id, cancelEventApi, refreshEvents, isRecurringOccurrence, occurrence_start, router]);

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

      {!isEventInPast && (
      <EventStatusActionButtons 
          currentUserStatus={event.attendees?.find(att => 
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
      />
      )}

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
