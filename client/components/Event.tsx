import React from 'react';
import { View, Text, Image, Dimensions, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { UpcomingEventProps, Event } from '@/types/allTypes';
import { differenceInCalendarDays, format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { AutoSkeletonView } from 'react-native-auto-skeleton';

const EventView: React.FC<{ event: Event, loading: boolean }> = ({ event, loading }) => {
  
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { width } = Dimensions.get('window');
  const height = width / 4;

  const getDaysRemainingLabel = (eventDate: any): string => {
    if (!eventDate) return 'Unknown date';
  
    const parsedDate = new Date(eventDate);
    if (isNaN(parsedDate.getTime())) return 'Invalid date';
  
    const today = new Date();
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

  return (
    <TouchableOpacity style={{ flexDirection: 'row', width: '100%', overflow: 'hidden', backgroundColor: 'transparent', alignItems: 'center' }}>
      {/* Event Image */}
      <AutoSkeletonView 
        isLoading={loading} 
        shimmerBackgroundColor={themeColors.background} 
        gradientColors={[
          themeColors.background, 
          themeColors.inputBackgroundColor
        ]}
      >
        <ThemedView style={{ width: height ,height: height, marginRight: 16 }}>
          <Image 
            source={event.event_picture || require('../assets/event-default.png')}
            style={{ width: '100%', height: '100%', borderRadius: 8 }}
            resizeMode="cover"
          />
        </ThemedView>
      </AutoSkeletonView>

      {/* Event Details */}
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        {/* Friend Info */}
        <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
          <AutoSkeletonView 
            isLoading={loading} 
            shimmerBackgroundColor={themeColors.background} 
            gradientColors={[
              themeColors.background, 
              themeColors.inputBackgroundColor
            ]}
          >
            <ThemedView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
            <Image
              source={
                event.creator?.profile_picture
                  ? { uri: event.creator.profile_picture }
                  : require('../assets/event-default.png')
              }
              style={{ aspectRatio: 1, width: '16%', borderRadius: 50, marginRight: 8 }}
            />
              <ThemedText style={{ fontSize: 12, fontWeight: '500', color: `${Colors[colorScheme ?? 'dark'].tint}` }}>{event?.creator?.full_name}</ThemedText>
            </ThemedView>
          </AutoSkeletonView>
          <AutoSkeletonView 
            isLoading={loading} 
            shimmerBackgroundColor={themeColors.background} 
            gradientColors={[
              themeColors.background, 
              themeColors.inputBackgroundColor
            ]}
          >
            <ThemedView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="clock" size={16} color={Colors[colorScheme ?? 'dark'].tint} style={{ marginRight: 8 }} />
              <ThemedText style={{ fontSize: 12, color: `${Colors[colorScheme ?? 'dark'].tint}`, marginLeft: 'auto' }}>
                {event?.start_time ? getDaysRemainingLabel(event.start_time) : 'Unknown date'}
              </ThemedText>
            </ThemedView>
          </AutoSkeletonView>
        </ThemedView>

        {/* Event Title */}
        <AutoSkeletonView 
          isLoading={loading} 
          shimmerBackgroundColor={themeColors.background} 
          gradientColors={[
            themeColors.background, 
            themeColors.inputBackgroundColor
          ]}
        >
          <ThemedText style={{ fontSize: 12, fontWeight: '500', color: `${Colors[colorScheme ?? 'dark'].tint}`, marginBottom: 8 }}>{event?.title}</ThemedText>
        </AutoSkeletonView>

        {/* Event Date and Time */}
        <AutoSkeletonView 
          isLoading={loading} 
          shimmerBackgroundColor={themeColors.background} 
          gradientColors={[
            themeColors.background, 
            themeColors.inputBackgroundColor
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Feather name="clock" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
            <ThemedText style={{ fontSize: 10, color: `${Colors[colorScheme ?? 'dark'].tint}`, marginLeft: 8 }}>
              {event?.start_time ? formatEventDateTime(event.start_time) : 'No time'}
            </ThemedText>
          </View>
        </AutoSkeletonView>

        {/* Event Location */}
        <AutoSkeletonView 
          isLoading={loading} 
          shimmerBackgroundColor={themeColors.background} 
          gradientColors={[
            themeColors.background, 
            themeColors.inputBackgroundColor
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="map-pin" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
            <ThemedText style={{ fontSize: 10, color: `${Colors[colorScheme ?? 'dark'].tint}`, marginLeft: 8 }}>{event?.location?.text}</ThemedText>
          </View>
        </AutoSkeletonView>
      </ThemedView>
    </TouchableOpacity>
  );
};

export default EventView;
