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
  const { fetchAttentionRequiredEvents, loading, clearCache } = useGetAttentionRequiredEvents();
  const { respondToInvitation } = useEventInvitation();
  const { refreshEvents } = useEventContext();
  const [attentionEvents, setAttentionEvents] = useState<Event[]>(initialEvents || []);
  const [loadingResponses, setLoadingResponses] = useState<{ [key: string]: boolean }>({});

  const declinedColor = "transparent"; // iOS red color for declined events
  const pendingColor = "transparent"; // Warm yellow color for pending responses

  // Memoize expensive event filtering
  const futureEvents = React.useMemo(() => {
    return attentionEvents.filter((event) => {
      const now = new Date();
      const eventStartDate = event.start_time ? new Date(event.start_time) : null;
      return eventStartDate && now < eventStartDate;
    });
  }, [attentionEvents]);

  // Memoize time calculation function
  const getTimeLeft = React.useCallback((startTime: string | Date | null, endTime: string | Date | null) => {
    if (!startTime || !endTime) return { value: 0, unit: 'DAYS' };
    
    const now = new Date();
    const eventStartDate = new Date(startTime);
    const eventEndDate = new Date(endTime);
    
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
      setAttentionEvents(events || []);
    } catch (error) {
      console.error('Error fetching attention required events:', error);
      setAttentionEvents([]);
    } finally {
      onFinishRefresh();
    }
  }, [fetchAttentionRequiredEvents, onFinishRefresh]);

  useEffect(() => {
    if (refreshing && !initialEvents) {
      // Force refresh when pull-to-refresh is triggered
      fetchEvents(true);
    } else if (!initialEvents) {
      // Normal fetch (will use cache if available)
      fetchEvents(false);
    }
  }, [refreshing, initialEvents, fetchEvents]);

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

      // Refresh the attention required events list
      await fetchEvents();

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
  }, [respondToInvitation, fetchEvents]);

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
          marginBottom: index === 0 ? 16 : 0,
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
    return (
      <ThemedView style={{ width: '100%', paddingHorizontal: 16 }}>
        {showHeader && (
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>
            Attention Required
          </ThemedText>
        )}
        <View
          style={{
            backgroundColor: themeColors.background,
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: themeColors.border,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
          }}
        >
          <View style={{ marginBottom: 12 }}>
            <IconSymbol
              name="checkmark.circle"
              size={32}
              color={themeColors.placeholderTextColor}
            />
          </View>
          <ThemedText 
            style={{ 
              fontSize: 16, 
              color: themeColors.placeholderTextColor,
              textAlign: 'center',
              marginBottom: 4,
              fontWeight: '600'
            }}
          >
            All caught up!
          </ThemedText>
          <ThemedText 
            style={{ 
              fontSize: 14, 
              color: themeColors.placeholderTextColor,
              textAlign: 'center',
              opacity: 0.8
            }}
          >
            No events need your attention right now
          </ThemedText>
        </View>
      </ThemedView>
    );
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

      <ThemedView style={{ paddingHorizontal: showHeader ? 16 : 0 }}>
        {loading || refreshing ? (
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