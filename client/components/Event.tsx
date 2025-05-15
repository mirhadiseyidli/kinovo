import React, { useEffect } from 'react';
import { View, Text, Image, Dimensions, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { UpcomingEventProps, Event } from '@/types/allTypes';
import { differenceInCalendarDays, format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { AutoSkeletonView } from 'react-native-auto-skeleton';
import { useRouter } from 'expo-router';

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
    router.push(`/(auth)/(viewEvent)/${event._id}`);
  }

  return (
    // <AutoSkeletonView 
    //   isLoading={true} 
    //   shimmerBackgroundColor={themeColors.background} 
    //   gradientColors={[
    //     themeColors.background, 
    //     themeColors.inputBackgroundColor
    //   ]}
    // >
      <TouchableOpacity 
        style={{ 
          flexDirection: 'row', 
          width: '100%', 
          overflow: 'hidden', 
          alignItems: 'center', 
          // backgroundColor: 'transparent' 
        }}
        onPress={handleViewEvent}
      >
        {/* Event Image */}
        <ThemedView style={{ width: height ,height: height, marginRight: 16 }}>
          <Image 
            source={event.event_picture || require('../assets/event-default.png')}
            style={{ width: '100%', height: '100%', borderRadius: 8 }}
            resizeMode="cover"
          />
        </ThemedView>

        {/* Event Details */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {/* Friend Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
              <ThemedView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                <Image
                  source={
                    event.creator?.profile_picture
                      ? { uri: event.creator.profile_picture }
                      : require('../assets/event-default.png')
                  }
                  style={{ aspectRatio: 1, width: '16%', borderRadius: 50, marginRight: 8 }}
                />
                <ThemedText style={{ fontSize: 12, fontWeight: '500' }}>
                  {event?.creator?.full_name}
                </ThemedText>
              </ThemedView>
              <ThemedView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {(event?.start_time && event?.end_time && (new Date(event.start_time) <= today && new Date(event.end_time) >= today)) ? (
                  <>
                    <Animated.View style={[
                      { height: 4, width: 4, borderRadius: 999, marginRight: 8, backgroundColor: themeColors.mountainGreen },
                      animatedStyle
                    ]} />
                    <ThemedText style={{ fontSize: 12, color: themeColors.tint, marginLeft: 'auto' }}>Live</ThemedText>
                  </>
                ) : (
                  <>
                    <Feather name="clock" size={16} color={themeColors.tint} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, color: themeColors.tint, marginLeft: 'auto' }}>
                      {event?.start_time ? getDaysRemainingLabel(event.start_time) : 'Unknown date'}
                    </ThemedText>
                  </>
                )}
              </ThemedView>
          </View>

          {/* Event Title */}
          <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 12, fontWeight: '500', color: `${Colors[colorScheme ?? 'dark'].tint}`, marginBottom: 8 }}>
              {event?.title}
            </ThemedText>
          </ThemedView>

          {/* Event Date and Time */}
          <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Feather name="clock" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
            <ThemedText style={{ fontSize: 10, color: `${Colors[colorScheme ?? 'dark'].tint}`, marginLeft: 8 }}>
              {event?.start_time ? formatEventDateTime(event.start_time) : 'No time'}
            </ThemedText>
          </ThemedView>

          {/* Event Location */}
          <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="map-pin" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
            <ThemedText style={{ fontSize: 10, color: `${Colors[colorScheme ?? 'dark'].tint}`, marginLeft: 8 }}>{event?.location?.text}</ThemedText>
          </ThemedView>
        </View>
      </TouchableOpacity>
    // </AutoSkeletonView>
  );
};

export default EventView;
