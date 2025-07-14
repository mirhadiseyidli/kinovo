import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Event } from '@/types/allTypes';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGetAttentionRequiredEvents } from '@/hooks/useGetAttentionRequiredEvents';
import { useEventInvitation } from '@/hooks/useEventInvitation';
import { useEventContext } from '@/context/UserSessionContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getCategoryImage } from '@/constants/CategoryImages';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { EventCardSkeleton } from '../Skeleton';
import { truncateName } from '@/utils/truncateName';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useFocusEffect } from '@react-navigation/native';
import { cacheManager } from '@/utils/homeScreenCache';
import { useAuthSession } from '@/components/Auth/AuthProvider';

interface AttentionRequiredProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
  initialEvents?: Event[];
  showHeader?: boolean;
}

type EventResponseStatus = 'accepted' | 'maybe' | 'rejected';

const AttentionRequired: React.FC<AttentionRequiredProps> = React.memo(({ 
  refreshing, 
  onFinishRefresh, 
  initialEvents,
  showHeader = true 
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const { fetchAttentionRequiredEvents, loading, isFirstFetch, clearCache, attentionEventsList } = useGetAttentionRequiredEvents();
  const { respondToInvitation } = useEventInvitation();
  const { refreshing: contextRefreshing, invalidateEvent } = useEventContext();
  const { userId } = useAuthSession();
  const [localEventsList, setLocalEventsList] = useState<Event[]>(initialEvents || []);
  const [loadingResponses, setLoadingResponses] = useState<{ [key: string]: boolean }>({});

  // Memoize expensive event filtering
  const futureEvents = React.useMemo(() => {
    return localEventsList.filter((event) => {
      const now = new Date();
      const eventStartDate = event.start_time ? new Date(event.start_time) : null;
      return eventStartDate && now < eventStartDate;
    });
  }, [localEventsList]);

  // Memoize time calculation function
  const getTimeLeft = React.useCallback((startTime: string | Date | null, endTime: string | Date | null) => {
    if (!startTime || !endTime) return { value: 0, unit: 'DAYS' };
    
    const now = new Date();
    const eventStartDate = new Date(startTime);
    
    // If the event is in the past or ongoing, don't show it
    if (now >= eventStartDate) {
      return { value: 0, unit: 'DAYS' };
    }
    
    // If the event is in the future
    const diffMs = eventStartDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return { value: diffDays, unit: 'DAYS' };
    } else if (diffHours > 0) {
      return { value: diffHours, unit: 'HOURS' };
    } else {
      return { value: diffMins, unit: 'MINUTES' };
    }
  }, []);

  const fetchEvents = React.useCallback(async (forceRefresh: boolean = false) => {
    try {
      // Backend optimization: Pass fromHomeScreen=true to limit response to first 3 events
      const events = await fetchAttentionRequiredEvents(true, forceRefresh);
      if (events && Array.isArray(events)) {
        setLocalEventsList(events);
      } else {
        setLocalEventsList([]);
      }
    } catch (error) {
      console.error('Error fetching attention required events:', error);
      setLocalEventsList([]);
    } finally {
      onFinishRefresh();
    }
  }, [fetchAttentionRequiredEvents, onFinishRefresh]);

  // Fetch events when explicitly refreshing (only if no initialEvents provided)
  useFocusEffect(
    React.useCallback(() => {
      // Don't fetch when initialEvents are provided - use those events only
      if (!initialEvents) {
        if (refreshing) {
          // Force refresh when pull-to-refresh is triggered
          fetchEvents(true);
        } else {
          // Normal fetch (will use cache if available)
          fetchEvents(false);
        }
      }
    }, [refreshing, fetchEvents, initialEvents])
  );

  // Update local state when hook state changes (only if no initialEvents provided)
  useEffect(() => {
    // Don't override initialEvents - only update when used on home screen without initialEvents
    if (attentionEventsList && !initialEvents) {
      setLocalEventsList(attentionEventsList);
    }
  }, [attentionEventsList, initialEvents]);

  // Clear cache when context signals a refresh is needed
  useEffect(() => {
    if (contextRefreshing) {
      clearCache();
    }
  }, [contextRefreshing, clearCache]);

  const handleViewEvent = React.useCallback((event: Event) => {
    const eventId = event.originalEventId || event._id;
    if (!eventId) return;

    const params: any = { event_id: eventId };
    if (event.isRecurringOccurrence && event.start_time && event.end_time) {
      params.occurrence_start = event.start_time;
      params.occurrence_end = event.end_time;
      params.is_occurrence = 'true';
    }

    router.push({
      pathname: "/(auth)/viewEvent/[event_id]" as const,
      params: params
    });
  }, [router]);

  const handleResponse = React.useCallback(async (event: Event, status: EventResponseStatus) => {
    const eventId = event.originalEventId || event._id;
    if (!eventId) return;

    setLoadingResponses(prev => ({ ...prev, [eventId]: true }));

    try {
      // Handle recurring events
      const requestOptions: any = {};
      
      if (event.isRecurringOccurrence && event.start_time) {
        requestOptions.occurrenceDate = event.start_time;
        requestOptions.modifyType = 'this_only';
      }

      await respondToInvitation(
        eventId, 
        status, 
        Object.keys(requestOptions).length > 0 ? requestOptions : undefined
      );

      // IMPORTANT: Invalidate event from subscriptions and cache to prevent data override
      invalidateEvent(eventId);

      // Update the event with new status and update across caches
      const updatedEvent = localEventsList.find(event => 
        event._id === eventId || event.originalEventId === eventId
      );
      
      if (updatedEvent && userId) {
        const eventWithNewStatus = {
          ...updatedEvent,
          userStatus: status
        };
        cacheManager.updateEventAcrossCaches(eventId, eventWithNewStatus, userId);
      }

      // Show success message
      const statusMessages: Record<EventResponseStatus, string> = {
        accepted: 'Accepted the event!',
        maybe: 'Marked as maybe',
        rejected: 'Declined the event'
      };
      Alert.alert('Success', statusMessages[status]);

    } catch (error) {
      console.error('Failed to respond to event:', error);
      Alert.alert(
        'Error',
        'Failed to update your response. Please try again.'
      );
    } finally {
      setLoadingResponses(prev => ({ ...prev, [eventId]: false }));
    }
  }, [respondToInvitation, invalidateEvent, localEventsList, userId]);

  const formatDate = React.useCallback((date: string | Date | null) => {
    if (!date) return '';
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  // Show skeleton only on first fetch, not on refreshes
  const showSkeleton = isFirstFetch && loading;

  const getDaysUntilResponse = React.useCallback((date: string | Date | null) => {
    if (!date) return 0;
    const eventDate = new Date(date);
    return Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  const renderEventCard = React.useCallback((event: Event, isLoading: boolean, isRejected: boolean, index: number) => {
    const timeLeft = getTimeLeft(event.start_time, event.end_time);

    // Don't render if the event is in the past or ongoing
    if (timeLeft.value === 0) return null;

    return (
      <TouchableOpacity
        key={event._id}
        onPress={() => handleViewEvent(event)}
        style={{
          borderRadius: 12,
          backgroundColor: themeColors.eventCardBackgroundColor,
          overflow: 'hidden',
        }}
      >
        <View style={{ flexDirection: 'row', flex: 1 }}>
          {/* Left Section */}
          <View style={{ flex: 3, padding: 16, paddingBottom: 0 }}>
            {/* Event Title */}
            <ThemedText style={{ 
              fontSize: 14,
              fontWeight: '600',
              marginBottom: 12,
              color: themeColors.text,
            }}>
              {truncateName(event.title, 20)}
            </ThemedText>

            {/* Date/Time */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Feather name="calendar" size={12} color={themeColors.textSecondary} style={{ marginRight: 8 }} />
              <ThemedText style={{ fontSize: 12, color: themeColors.textSecondary }}>
                {formatDate(event.start_time)}
              </ThemedText>
            </View>

            {/* Location */}
            {event.location?.text ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Feather name="map-pin" size={12} color={themeColors.textSecondary} style={{ marginRight: 8 }} />
                <ThemedText 
                  numberOfLines={1}
                  style={{ 
                    fontSize: 12,
                    color: themeColors.textSecondary,
                    maxWidth: '90%'
                  }}
                >
                  {event.location.text.length > 25 
                    ? `${event.location.text.substring(0, 25)}...` 
                    : event.location.text}
                </ThemedText>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Feather name="map-pin" size={12} color={themeColors.textSecondary} style={{ marginRight: 8 }} />
                <ThemedText 
                  numberOfLines={1}
                  style={{ 
                    fontSize: 12,
                    color: themeColors.textSecondary,
                    maxWidth: '90%'
                  }}
                >
                  Location TBD
                </ThemedText>
              </View>
            )}

            {/* Status Badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: "transparent",
              borderColor: isRejected ? themeColors.border : themeColors.mountainGreen,
              borderWidth: 1,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 4,
              alignSelf: 'flex-start',
            }}>
              {isRejected ? (
                <>
                  <Feather name="x-circle" size={10} color={themeColors.text} style={{ marginRight: 4 }} />
                  <ThemedText style={{ 
                    fontSize: 10,
                    color: themeColors.text,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    textDecorationLine: 'line-through'
                  }}>
                    Declined
                  </ThemedText>
                  <View style={{
                    width: 1,
                    height: '80%',
                    backgroundColor: themeColors.text,
                    marginHorizontal: 6,
                  }} />
                  <ThemedText style={{ 
                    fontSize: 10,
                    color: themeColors.text,
                    fontWeight: 'bold',
                  }}>
                    {`${timeLeft.value} ${timeLeft.unit} LEFT`}
                  </ThemedText>
                </>
              ) : (
                <>
                  <Feather name="clock" size={10} color={themeColors.text} style={{ marginRight: 4 }} />
                  <ThemedText style={{ 
                    fontSize: 10,
                    color: themeColors.text,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  }}>
                    Pending
                  </ThemedText>
                  <View style={{
                    width: 1,
                    height: '80%',
                    backgroundColor: themeColors.text,
                    marginHorizontal: 6,
                  }} />
                  <ThemedText style={{ 
                    fontSize: 10,
                    color: themeColors.text,
                    fontWeight: 'bold',
                  }}>
                    {`${timeLeft.value} ${timeLeft.unit} LEFT`}
                  </ThemedText>
                </>
              )}
            </View>
          </View>

          {/* Right Section */}
          <View style={{ 
            flex: 2,
            padding: 16,
            paddingBottom: 0,
            alignItems: 'flex-end'
          }}>
            {/* Invited By Section */}
            <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' }}>
              <ThemedText style={{ 
                fontSize: 10,
                color: themeColors.text,
                opacity: 0.9,
                textAlign: 'right',
                marginRight: 4,
              }}>
                Invited by
              </ThemedText>
              <ThemedText style={{ 
                fontSize: 12,
                fontWeight: '600',
                color: themeColors.text,
                textAlign: 'right',
              }}>
                {event.creator?.full_name || 'Unknown'}
              </ThemedText>
            </View>

            {/* Event Image */}
            <View style={{
              width: 64,
              aspectRatio: 1,
              borderRadius: 8,
              overflow: 'hidden',
              position: 'relative'
            }}>
              <OptimizedImage
                source={event.event_picture || null}
                fallbackCategory={event.category}
                style={{
                  width: '100%',
                  height: '100%',
                  opacity: 0.8,
                }}
                resizeMode="cover"
                width={64}
                height={64}
                quality={0.8}
                showLoader={true}
              />
              {/* Category with blur overlay */}
              <BlurView
                intensity={50}
                tint={colorScheme === 'dark' ? 'dark' : 'light'}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  paddingVertical: 4,
                  backgroundColor: colorScheme === 'dark' ? 'rgba(50, 50, 50, 0.6)' : 'rgba(200, 200, 200, 0.6)',
                }}
              >
                <ThemedText style={{ 
                  fontSize: 8,
                  color: themeColors.text,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  textTransform: 'capitalize',
                }}>
                  {event.category?.toLowerCase() || 'Other'}
                </ThemedText>
              </BlurView>
            </View>
          </View>
        </View>

        {/* Bottom Content */}
        <View style={{ 
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {isRejected ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: themeColors.eventCardBackgroundColor,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  opacity: 0.8,
                  flex: 1,
                }}
              >
                <ThemedText style={{ 
                  fontSize: 11, 
                  fontWeight: '600',
                  color: themeColors.textSecondary 
                }}>
                  Reconsider
                </ThemedText>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => handleResponse(event, 'accepted')}
                  disabled={isLoading}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: themeColors.eventCardBackgroundColor,
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: isLoading ? 0.6 : 1,
                    flex: 1,
                  }}
                >
                  <Feather name="check" size={11} color={themeColors.text} style={{ marginRight: 4 }} />
                  <ThemedText style={{ fontSize: 11, fontWeight: '600', color: themeColors.text }}>Accept</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleResponse(event, 'maybe')}
                  disabled={isLoading}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: themeColors.eventCardBackgroundColor,
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: isLoading ? 0.6 : 1,
                    flex: 1,
                  }}
                >
                  <MaterialIcons name="question-mark" size={11} color={themeColors.text} style={{ marginRight: 4 }} />
                  <ThemedText style={{ fontSize: 11, fontWeight: '600', color: themeColors.text }}>Maybe</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleResponse(event, 'rejected')}
                  disabled={isLoading}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: themeColors.eventCardBackgroundColor,
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: isLoading ? 0.6 : 1,
                    flex: 1,
                  }}
                >
                  <Feather name="x" size={11} color={themeColors.text} style={{ marginRight: 4 }} />
                  <ThemedText style={{ fontSize: 11, fontWeight: '600', color: themeColors.text }}>Decline</ThemedText>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [getTimeLeft, themeColors, handleViewEvent, handleResponse, formatDate]);

  if (futureEvents.length === 0) {
    return null;
  }

  return (
    <ThemedView style={{ width: '100%' }}>
      {showHeader && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 16, 
          paddingHorizontal: 16 
        }}>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
            Attention Required
          </ThemedText>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => router.push('/(auth)/attention-required')}
          >
            <ThemedText style={{ fontSize: 16, marginRight: 4 }}>Manage All</ThemedText>
            <Feather name="chevron-right" size={16} color={themeColors.tint} />
          </TouchableOpacity>
        </View>
      )}

      <ThemedView style={{ paddingHorizontal: showHeader ? 16 : 0, gap: 16 }}>
        {showSkeleton ? (
          <EventCardSkeleton count={2} />
        ) : (
          futureEvents.map((event, index) => renderEventCard(event, loadingResponses[event._id || ''] || false, event.userStatus === 'rejected', index))
        )}
      </ThemedView>
    </ThemedView>
  );
});

AttentionRequired.displayName = 'AttentionRequired';

export default AttentionRequired; 