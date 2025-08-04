import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, Dimensions, TouchableOpacity, AppState } from 'react-native';
import Animated from 'react-native-reanimated';
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
import DefaultProfilePicture from './DefaultProfilePicture';
import { useFocusEffect } from '@react-navigation/native';
import { SkeletonBox } from './Skeleton';
import { Image } from 'expo-image';

const EventView: React.FC<{ event: Event, loading: boolean }> = React.memo(({ event, loading }) => {
  
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { width } = Dimensions.get('window');
  const height = width / 4;
  const router = useRouter();
  const today = new Date();

  const [isVisible, setIsVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const mountedRef = useRef(true);
  const containerRef = useRef<View>(null);
  const visibilityCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if event is currently live (happening right now)
  const isEventLive = useMemo(() => {
    if (!event.start_time || !event.end_time) return false;
    
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    
    return currentTime >= startTime && currentTime <= endTime;
  }, [event.start_time, event.end_time, currentTime]);

  // Update current time every minute to check if event status changes
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timeInterval);
  }, []);

  // Efficient visibility detection - only check when needed
  const checkVisibility = useCallback(() => {
    if (!containerRef.current || !mountedRef.current) return;

    containerRef.current.measureInWindow((x, y, width, height) => {
      const screenHeight = Dimensions.get('window').height;
      const screenWidth = Dimensions.get('window').width;
      
      // Consider component visible if it's at least partially on screen
      const isInViewport = (
        x + width > 0 && 
        x < screenWidth && 
        y + height > 0 && 
        y < screenHeight
      );
      
      const wasVisible = isVisible;
      setIsVisible(isInViewport);
    });
  }, [isVisible, event.title]);

  // Debounced visibility check to avoid excessive calls
  const debouncedVisibilityCheck = useCallback(() => {
    if (visibilityCheckTimeoutRef.current) {
      clearTimeout(visibilityCheckTimeoutRef.current);
    }
    
    visibilityCheckTimeoutRef.current = setTimeout(checkVisibility, 100);
  }, [checkVisibility]);

  // Check visibility when screen gains focus (user returns to app/screen)
  useFocusEffect(
    useCallback(() => {
      debouncedVisibilityCheck();
    }, [debouncedVisibilityCheck])
  );

  // Check visibility when app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        debouncedVisibilityCheck();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [debouncedVisibilityCheck]);

  // Initial visibility check on mount
  useEffect(() => {
    const timeoutId = setTimeout(debouncedVisibilityCheck, 100);
    return () => clearTimeout(timeoutId);
  }, [debouncedVisibilityCheck]);

  // Use onLayout to detect when component position changes
  const handleLayout = useCallback(() => {
    debouncedVisibilityCheck();
  }, [debouncedVisibilityCheck]);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (visibilityCheckTimeoutRef.current) {
        clearTimeout(visibilityCheckTimeoutRef.current);
      }
    };
  }, []);
  

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
  
    return format(parsedDate, 'MMM d, yyyy');
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

    // Always display in format: "Sat, Jun 6, 5:20PM"
    return `${format(parsed, 'EEE, MMM d')}, ${timeString}`;
  };

  const handleViewEvent = () => {
    // Check if event is cancelled - this is a safety check since cancelled events 
    // should already be filtered out from most lists
    if (event.status === 'cancelled') {
      return; // Don't navigate to cancelled events
    }

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
        pathname: "/(auth)/viewEvent/[event_id]" as const,
        params: params
      });
    }, 50);
  }

  const truncateName = (name: string, maxLength: number) => {
    return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
  };

  return (
      <TouchableOpacity 
        ref={containerRef}
        onLayout={handleLayout}
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
        }}
        onPress={handleViewEvent}
      >
        {/* Event Image */}
        <View style={{ width: height, height: height, marginRight: 16, borderRadius: 8, overflow: 'hidden' }}>
          <Image
            source={getCategoryImage(event.category)}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            onError={() => {
              return <SkeletonBox width={height} height={height} borderRadius={8} />;
            }}
            onProgress={() => {
              return <SkeletonBox width={height} height={height} borderRadius={8} />;
            }}
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
        <View style={{ flex: 1, justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* Friend Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                <View style={{ marginRight: 4 }}>
                  <DefaultProfilePicture
                    profilePicture={event.creator?.profile_picture}
                    fullName={event.creator?.full_name}
                    size={16}
                    borderRadius={999}
                  />
                </View>
                <ThemedText style={{ fontSize: 12, fontWeight: '500' }}>
                  {truncateName(event?.creator?.full_name || 'Unknown', 16)}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {isEventLive ? (
                  <>
                    <Animated.View style={{
                      height: 4, 
                      width: 4, 
                      borderRadius: 999, 
                      marginRight: 8, 
                      backgroundColor: themeColors.mountainGreen,
                      transform: [{ scale: 1 }],
                      ...(isEventLive && {
                        animationName: {
                          '0%': { transform: [{ scale: 1 }] },
                          '50%': { transform: [{ scale: 1.5 }] },
                          '100%': { transform: [{ scale: 1 }] },
                        },
                        animationDuration: '800ms',
                        animationIterationCount: 'infinite',
                        animationTimingFunction: 'ease-in-out',
                      }),
                    }} />
                    <ThemedText 
                      style={{ fontSize: 12, color: themeColors.tint }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Live now
                    </ThemedText>
                  </>
                ) : (
                  <ThemedText 
                    style={{ fontSize: 12, color: themeColors.textSecondary }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {getDaysRemainingLabel(event.start_time)}
                  </ThemedText>
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
              backgroundColor: themeColors.maybeStatusColor + '50',
              borderColor: themeColors.maybeStatusColor,
              borderWidth: 1,
              borderRadius: 4,
              paddingHorizontal: 4,
              paddingVertical: 2,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}>
              <ThemedText style={{ fontSize: 8, color: 'white', fontWeight: '500', textTransform: 'capitalize' }}>{event.userStatus}</ThemedText>
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
});

export default EventView;
