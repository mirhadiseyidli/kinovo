import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ActionSheetIOS, ViewStyle, TextStyle, Alert } from 'react-native';
import { Event, User } from '@/types/allTypes';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useViewEventModal } from '@/context/ViewEventModalContext';
import DefaultProfilePicture from '../DefaultProfilePicture';
import { useEventMutations } from '@/hooks/useEventMutations';
import { useLocalSearchParams } from 'expo-router';

type AttendeeAvatarProps = {
  attendee: (NonNullable<Event['attendees']>)[number];
  index: number;
};

const AttendeeAvatar = React.memo<AttendeeAvatarProps>(({ attendee, index }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{
      marginLeft: index > 0 ? -12 : 0,
      borderColor: themeColors.background,
      borderWidth: 2,
      borderRadius: 30,
    }}>
      <DefaultProfilePicture
        profilePicture={attendee.user.profile_picture}
        fullName={attendee.user.full_name}
        size={48}
        borderRadius={24}
      />
    </View>
  );
});

type AttendeeRowProps = {
  attendee: (NonNullable<Event['attendees']>)[number];
  isCreator: boolean;
  creatorId: string | undefined;
  onRemove: (id: string) => void;
};

const AttendeeRow = React.memo<AttendeeRowProps>(({ attendee, isCreator, creatorId, onRemove }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const getStatusStyle = () => {
    switch (attendee.status) {
      case 'accepted':
        return {
          backgroundColor: themeColors.mountainGreen,
          borderColor: themeColors.mountainGreen,
          borderWidth: 1,
          color: themeColors.text
        };
      case 'maybe':
        return {
          backgroundColor: themeColors.maybeStatusColor + '50',
          borderColor: themeColors.maybeStatusColor,
          borderWidth: 1,
          color: 'white'
        };
      case 'rejected':
        return {
          backgroundColor: themeColors.background + '20',
          borderColor: themeColors.border,
          borderWidth: 1,
          color: themeColors.text
        };
      default:
        return {
          backgroundColor: themeColors.mountainGreen + '20',
          borderColor: themeColors.mountainGreen,
          borderWidth: 1,
          color: themeColors.text
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (attendee.status) {
      case 'rejected':
        return {
          textDecorationLine: 'line-through'
        };
      default:
        return {};
    }
  };

  const getStatusText = () => {
    switch (attendee.status) {
      case 'accepted':
        return 'Going';
      case 'maybe':
        return 'Maybe';
      case 'rejected':
        return 'Not Going';
      default:
        return 'Pending';
    }
  };

  const statusStyle = getStatusStyle();
  const textStyle = getTextStyle();

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View style={{ marginRight: 12 }}>
          <DefaultProfilePicture
            profilePicture={attendee.user.profile_picture}
            fullName={attendee.user.full_name}
            size={40}
            borderRadius={20}
        />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText>{attendee.user.full_name}</ThemedText>
          <View style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 4,
            alignSelf: 'flex-start',
            marginTop: 4,
            ...statusStyle
          }}>
            <ThemedText style={{ 
              fontSize: 8,
              fontWeight: 'bold',
              color: statusStyle.color,
              ...textStyle
            }}>
              {getStatusText()}
            </ThemedText>
          </View>
        </View>
      </View>
      {isCreator && attendee.user._id !== creatorId && (
        <TouchableOpacity onPress={() => onRemove(attendee.user._id!)}>
          <Feather name="x" size={20} color="red" />
        </TouchableOpacity>
      )}
    </View>
  );
});

const EventAttendees = ({ userId, event }: { userId: string | null, event: Event }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [showAll, setShowAll] = useState(false);
  const expanded = useSharedValue(0); // 0: collapsed, 1: expanded
  const [isExpanded, setIsExpanded] = useState(false);
  const attendeeCount = (event?.attendees ?? []).length || 0;
  const { showModal } = useViewEventModal();
  const { removeAttendee } = useEventMutations();
  // Cache invalidation handled automatically by useEventMutations
  const { occurrence_start, is_occurrence } = useLocalSearchParams();
  const [attendees, setAttendees] = useState<Event['attendees']>(event.attendees ?? []);
  
  // Check if this is a recurring occurrence
  const isRecurringOccurrence = is_occurrence === 'true' && occurrence_start;

  const handleRemoveAttendee = useCallback(async (
    id: string, 
    options?: { modifyType?: 'this_only' | 'all_future' }
  ) => {
    const attendee = event.attendees?.find(a => a.user._id === id);
    if (!attendee) return;

    const attendeeName = attendee.user.first_name && attendee.user.last_name 
      ? `${attendee.user.first_name} ${attendee.user.last_name}`
      : attendee.user.username || 'this attendee';

    try {
      const requestOptions: any = {};
      
      // If this is a recurring occurrence and we have options, include them
      if (isRecurringOccurrence && options?.modifyType && occurrence_start) {
        const occurrenceDate = Array.isArray(occurrence_start) ? occurrence_start[0] : occurrence_start;
        requestOptions.occurrenceDate = occurrenceDate;
        requestOptions.modifyType = options.modifyType;
      }
      
      await removeAttendee({
        eventId: event._id!,
        attendeeId: id,
        ...requestOptions
      });
      // Cache invalidation handled automatically by useEventMutations

      // Update the attendees list
      setAttendees(attendees?.filter(a => a.user._id !== id) ?? []);
      
      const message = options?.modifyType === 'this_only' 
        ? `${attendeeName} has been removed from this specific event occurrence.`
        : options?.modifyType === 'all_future'
        ? `${attendeeName} has been removed from all future occurrences of this event.`
        : `${attendeeName} has been removed from the event.`;
        
      Alert.alert('Success', message);
    } catch (error) {
      console.error('Failed to remove attendee:', error);
    }
  }, [event._id, event.attendees, removeAttendee, isRecurringOccurrence, occurrence_start]);

  const handleRemove = useCallback(async (id: string) => {
    const attendee = event.attendees?.find(a => a.user._id === id);
    if (!attendee) return;

    const attendeeName = attendee.user.first_name && attendee.user.last_name 
      ? `${attendee.user.first_name} ${attendee.user.last_name}`
      : attendee.user.username || 'this attendee';

    // Check if this is a recurring event occurrence
    if (isRecurringOccurrence) {
      showModal('remove_attendee_recurring', { 
        attendeeName,
        onConfirm: handleRemoveAttendee,
        attendeeId: id
      });
    } else {
      showModal('attendee_remove_confirm', {
        attendeeId: id,
        onConfirm: handleRemoveAttendee
      });
    }
  }, [event.attendees, isRecurringOccurrence, handleRemoveAttendee, showModal]);

  useAnimatedReaction(
    () => expanded.value,
    (current, prev) => {
      if (current !== prev) {
        runOnJS(setIsExpanded)(current === 1);
      }
    },
    []
  );

  const confirmRemoveAttendee = useCallback((attendeeId: string) => {
    showModal('attendee_remove_confirm', {
      attendeeId,
      onConfirm: handleRemove
    });
  }, [handleRemove, showModal]);

  const useCollapsedRowStyle = (expanded: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      opacity: withTiming(expanded.value === 1 ? 0 : 1, { duration: 300 }),
      height: withTiming(expanded.value === 1 ? 0 : 52, { duration: 300 }),
    }));
  
  const useExpandedListStyle = (expanded: SharedValue<number>, count: number) =>
    useAnimatedStyle(() => ({
      opacity: withTiming(expanded.value),
      height: withTiming(expanded.value ? count * 52 : 0),
      overflow: 'hidden' as ViewStyle['overflow'],
    }));

  useEffect(() => {
    setAttendees(event.attendees ?? []);
  }, [event.attendees]);

  return (
    <View style={{ paddingTop: 16, borderTopColor: themeColors.calendarBorderColor, borderTopWidth: 0.2, }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <Feather name="users" size={16} color={themeColors.mountainGreen} />
        <View style={{ flexDirection: 'column', gap: 4 }}>
          <ThemedText>{attendeeCount} attending</ThemedText>
          <ThemedText style={{ color: themeColors.placeholderTextColor }}>
            Capacity: {event?.capacity || 'Unlimited'}
          </ThemedText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Attendees</ThemedText>
        <TouchableOpacity 
          style={{
            flexDirection: 'row',
            gap: 2
          }}
          onPress={() => (expanded.value = expanded.value === 1 ? 0 : 1)}
        >
          <ThemedText>Show All</ThemedText>
          <Feather
            name="chevron-right"
            size={16}
            style={{
              transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
              color: themeColors.tint,
            }}
          />
        </TouchableOpacity>
      </View>
      <Animated.View style={[{
        flexDirection: 'row',
      }, useCollapsedRowStyle(expanded)]}>
        {(event?.attendees ?? []).slice(0, 3).map((attendee, index) => (
          <AttendeeAvatar key={attendee.user._id} attendee={attendee} index={index} />
        ))}
        {(event?.attendees ?? []).length > 3 && (
          <TouchableOpacity onPress={() => (expanded.value = 1)} style={{
            marginLeft: -12,
            width: 52,
            height: 52,
            borderRadius: 30,
            backgroundColor: themeColors.inputBackgroundColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ThemedText>+{(event.attendees ?? []).length - 3}</ThemedText>
          </TouchableOpacity>
        )}
      </Animated.View>
      <Animated.View style={useExpandedListStyle(expanded, (event.attendees ?? []).length)}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        </View>
        {(attendees ?? []).map((attendee) => (
          <AttendeeRow 
            key={attendee.user._id} 
            attendee={attendee} 
            isCreator={userId === event.creator?._id} 
            creatorId={event.creator?._id}
            onRemove={(id) => confirmRemoveAttendee(id)} 
          />
        ))}
      </Animated.View>
    </View>
  );
};

export default React.memo(EventAttendees);
