import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ActionSheetIOS, ViewStyle } from 'react-native';
import { Event } from '@/types/allTypes';
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

type AttendeeAvatarProps = {
  attendee: (NonNullable<Event['attendees']>)[number];
  index: number;
};

const AttendeeAvatar = React.memo(({ attendee, index }: AttendeeAvatarProps) => {
  const avatarStyle: ViewStyle = {
    marginLeft: index === 0 ? 0 : -12,
    width: 52,
    height: 52,
    borderRadius: 30,
    overflow: 'hidden' as ViewStyle['overflow'],
  };

  return (
    <View key={attendee.user._id} style={avatarStyle}>
      <Image 
        source={attendee.user.profile_picture ? { uri: attendee.user.profile_picture } : require('@/assets/profile-pic-2.jpeg')} 
        style={{ width: 52, height: 52, borderRadius: 30 }} 
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

const AttendeeRow = React.memo(({ attendee, isCreator, creatorId, onRemove }: AttendeeRowProps) => {
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  };

  return (
    <View style={rowStyle}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image 
          source={attendee.user.profile_picture ? { uri: attendee.user.profile_picture } : require('@/assets/profile-pic-2.jpeg')} 
          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} 
        />
        <ThemedText>{attendee.user.full_name}</ThemedText>
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

  const handleRemove = useCallback((id: string) => {
    console.log('remove user');
  }, []);

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
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Remove User'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 0,
        userInterfaceStyle: 'dark',
      },
      (buttonIndex) => {
        if (buttonIndex === 1) {
          handleRemove(attendeeId);
        }
      }
    );
  }, [handleRemove]);

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
        {(event?.attendees ?? []).map((attendee) => (
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
