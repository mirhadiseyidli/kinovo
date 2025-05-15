import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActionSheetIOS, Platform, type ViewStyle } from 'react-native';
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

const EventDetailsSection: React.FC<EventProp> = ({ event }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);

  const currentUserStatus = event.attendees?.find(att => 
    att.user?._id === loggedInUserId
  )?.status ?? null;
    
  useEffect(() => {
    (async () => {
      const storedUserId = await AsyncStorage.getItem('userId');
      setLoggedInUserId(storedUserId);
    })();
  }, []);

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

  const editEvent = useCallback(() => {
    console.log('event edited');
  }, []);

  const cancelEvent = useCallback(() => {
    console.log('cancelled event');
  }, []);

  const inviteToEvent = useCallback(() => {
    console.log('invited to event');
  }, []);

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

  return (
    <View style={{ flexDirection: 'column', gap: 16 }}>
      <EventTitleAndCategory title={event.title} category={event.category}/>

      <EventTimeAndDate startLabel={startLabel} endLabel={endLabel} />

      {event.recurrence?.checked && (
        <EventRecurrence frequency={event.recurrence.frequency} endDate={event.recurrence.end_date} />
      )}

      <EventStatusActionButtons 
        currentUserStatus={currentUserStatus}
        onCancel={cancelEvent}
        onEdit={editEvent}
        onInvite={inviteToEvent}
        isCreator={event.creator?._id === loggedInUserId}
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
