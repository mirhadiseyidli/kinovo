import React, { useEffect } from 'react';
import { View, Text, Image, Dimensions, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { UpcomingEventProps, Event } from '@/types/allTypes';
import { differenceInCalendarDays, format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { useRouter } from 'expo-router';
import { getCategoryImage } from '@/constants/CategoryImages';
import { BlurView } from 'expo-blur';

const EventView: React.FC<{ event: Event, loading: boolean }> = ({ event, loading }) => {
  
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { width } = Dimensions.get('window');
  const height = width / 4;
  const router = useRouter();
  const today = new Date();

  const pulse = useSharedValue(1);
  
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.5, {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [pulse]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
    };
  });

  // Determine styling based on user status
  const userStatus = event.userStatus;
  let containerOpacity = 1;
  let titleStyle: any = { 
    fontSize: 12, 
    fontWeight: '500', 
    color: themeColors.tint, 
    marginBottom: 8 
  };
  let borderWidth = 0;
  let borderColor = 'transparent';
  let showStripes = false;

  if (userStatus === 'rejected') {
    containerOpacity = 0.7;
    titleStyle = {
      ...titleStyle,
      textDecorationLine: 'line-through',
    };
  }

  const getDaysRemainingLabel = (eventDate: any): string => {
    if (!eventDate) return 'Unknown date';
  
    const parsedDate = new Date(eventDate);
    if (isNaN(parsedDate.getTime())) return 'Invalid date';
  
    const daysDiff = differenceInCalendarDays(parsedDate, today);
  
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Tomorrow';
    if (daysDiff > 1) return `in ${daysDiff} days`;
  
    return format(parsedDate, 'PPP');
  };

  const formatEventDateTime = (date: string | Date): string => {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return 'Invalid date';

    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeString = parsed.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: localTimeZone,
    });

    if (isToday(parsed)) {
      return `Today, ${timeString}`;
    } else if (isTomorrow(parsed)) {
      return `Tomorrow, ${timeString}`;
    } else if (isThisWeek(parsed)) {
      return `${format(parsed, 'EEE')}, ${timeString}`;
    } else {
      return `${format(parsed, 'EEE, MMM d')}, ${timeString}`;
    }
  };

  const handleViewEvent = () => {
    // For recurring event occurrences, use the originalEventId, otherwise use the regular _id
    const eventId = event.originalEventId || event._id;
    if (!eventId) return;

    // Prepare navigation parameters
    const params: any = {
      event_id: eventId,
      timestamp: Date.now() // Add timestamp to force new navigation
    };

    // For recurring event occurrences, pass the occurrence date information
    if (event.isRecurringOccurrence && event.start_time && event.end_time) {
      params.occurrence_start = event.start_time;
      params.occurrence_end = event.end_time;
      params.is_occurrence = 'true';
    }

    // Add a small delay to prevent rapid transitions
    setTimeout(() => {
      router.push({
        pathname: "/(auth)/(viewEvent)/[event_id]" as const,
        params: params
      });
    }, 50);
  }

  const truncateName = (name: string, maxLength: number) => {
    return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
  };

  return (
      <TouchableOpacity 
        style={{ 
          flexDirection: 'row', 
          width: '100%', 
          overflow: 'hidden', 
          alignItems: 'center',
          backgroundColor: themeColors.eventCardBackgroundColor,
          opacity: containerOpacity,
          borderWidth: borderWidth,
          borderColor: borderColor,
          borderRadius: 12,
          position: 'relative',
          padding: 16,
          // backgroundColor: 'transparent' 
        }}
        onPress={handleViewEvent}
      >
        {/* Event Image */}
        <View style={{ width: height, height: height, marginRight: 16, borderRadius: 8, overflow: 'hidden' }}>
          <Image 
            source={event.event_picture ? { uri: event.event_picture } : getCategoryImage(event.category)}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          {/* Category Overlay */}
          <BlurView
            intensity={50}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingVertical: 4,
              paddingHorizontal: 8,
              backgroundColor: colorScheme === 'dark' ? 'rgba(50, 50, 50, 0.6)' : 'rgba(200, 200, 200, 0.6)',
            }}
          >
            <ThemedText style={{ fontSize: 10, fontWeight: '500', textTransform: 'capitalize' }}>
              {event.category?.toLowerCase() || 'Other'}
            </ThemedText>
          </BlurView>
        </View>

        {/* Event Details */}
        <View style={{ flex: 1, justifyContent: 'center', position: 'relative' }}>
          {/* Friend Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                <Image
                  source={
                    event.creator?.profile_picture
                      ? { uri: event.creator.profile_picture }
                      : require('../assets/event-default.png')
                  }
                  style={{ aspectRatio: 1, width: '16%', borderRadius: 50, marginRight: 4 }}
                />
                <ThemedText style={{ fontSize: 12, fontWeight: '500' }}>
                  {truncateName(event?.creator?.full_name || 'Unknown', 15)}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {(event?.start_time && event?.end_time && (new Date(event.start_time) <= today && new Date(event.end_time) >= today)) ? (
                  <>
                    <Animated.View style={[
                      { height: 4, width: 4, borderRadius: 999, marginRight: 8, backgroundColor: themeColors.mountainGreen },
                      animatedStyle
                    ]} />
                    <ThemedText style={{ fontSize: 12, color: themeColors.tint}}>Live</ThemedText>
                  </>
                ) : (
                  <>
                    <Feather name="clock" size={14} color={themeColors.tint} style={{ marginRight: 4 }} />
                    <ThemedText style={{ fontSize: 12, color: themeColors.tint }}>
                      {event?.start_time ? getDaysRemainingLabel(event.start_time) : 'Unknown date'}
                    </ThemedText>
                  </>
                )}
              </View>
          </View>

          {/* Event Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText style={titleStyle}>
              {event?.title}
            </ThemedText>
            {event?.isRecurringOccurrence && (
              <Feather 
                name="repeat" 
                size={12} 
                color={themeColors.mountainGreen} 
                style={{ marginLeft: 8, marginBottom: 8 }} 
              />
            )}
          </View>

          {/* Event Date and Time */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Feather name="clock" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
            <ThemedText style={{ fontSize: 10, color: `${Colors[colorScheme ?? 'dark'].tint}`, marginLeft: 4 }}>
              {event?.start_time ? formatEventDateTime(event.start_time) : 'No time'}
            </ThemedText>
          </View>

          {/* Event Location */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="map-pin" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
            <ThemedText style={{ fontSize: 10, color: `${Colors[colorScheme ?? 'dark'].tint}`, marginLeft: 4 }}>{truncateName(event?.location?.text || 'Location TBD', 18)}</ThemedText>
          </View>

          {/* Maybe status indicator */}
          {userStatus === 'maybe' && (
            <View style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: themeColors.maybeStatusColor,
              borderRadius: 4,
              paddingHorizontal: 4,
              paddingVertical: 2,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}>
              <ThemedText style={{ fontSize: 10, color: 'white', fontWeight: 'bold', textTransform: 'capitalize' }}>{event.userStatus}</ThemedText>
            </View>
          )}
          {/* Declined status indicator */}
          {userStatus === 'rejected' && (
            <View style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: themeColors.background,
              borderWidth: 1,
              borderColor: themeColors.border,
              borderRadius: 4,
              paddingHorizontal: 4,
              paddingVertical: 2,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}>
              <ThemedText style={{ fontSize: 10, color: themeColors.text, fontWeight: 'bold', textTransform: 'capitalize', textDecorationLine: 'line-through' }}>{event.userStatus}</ThemedText>
            </View>
          )}
        </View>
      </TouchableOpacity>
  );
};

export default EventView;
