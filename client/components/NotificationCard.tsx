import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import DefaultProfilePicture from './DefaultProfilePicture';
import { NotificationCardProps } from '@/types/allTypes';
import InvitationActionButtons from './InvitationActionButtons';
import { useRespondToInvitation } from '@/hooks/useNewEventMutations';
import { ThemedText } from '@/components/ThemedText';
import { getCategoryImage } from '@/constants/CategoryImages';
import { Image } from 'expo-image';
import { SkeletonBox } from './Skeleton';
import { useAuthSession } from '@/components/Auth/AuthProvider';

type EventResponseStatus = 'accepted' | 'maybe' | 'rejected';

/**
 * NotificationCard - MIGRATED to New TanStack Query Architecture
 * 
 * Migration changes:
 * - useEventMutations → useRespondToInvitation from new architecture
 * - Changed from async/await pattern to callback-based mutation pattern
 * - Direct cache updates instead of invalidation
 * - Added proper success/error handling with mutation callbacks
 * - Supports recurring event modifications
 */

const NotificationCard: React.FC<NotificationCardProps> = React.memo(({ notification, onPress, isMarking = false }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  // Direct cache updates handled automatically by new TanStack Query architecture
  const { userId } = useAuthSession();

  const isUserNotification = ['friend_request_accepted', 'someone_from_contacts_joined'].includes(notification.type);

  const thumbnail = useMemo(() => {
    if (isUserNotification) {
      return <DefaultProfilePicture 
              size={40} 
              profilePicture={notification.sender?.profile_picture} 
              firstName={notification.sender?.first_name} 
              lastName={notification.sender?.last_name}
              fullName={notification.sender?.full_name}
              showBorder={true}
              borderColor={themeColors.border}
            />
    }

    // Event-based: use event image or category fallback
    const category = notification.event?.category || notification.data?.eventCategory || null;
    return (
      <Image
        source={getCategoryImage(category)}
        style={{ width: 40, height: 40, borderRadius: 8 }}
        contentFit="cover"
        onError={() => {
          return <SkeletonBox width={40} height={40} borderRadius={8} />;
        }}
        onProgress={() => {
          return <SkeletonBox width={40} height={40} borderRadius={8} />;
        }}
      />
    );
  }, [isUserNotification, notification]);

  const displayTime = useMemo(() => {
    if (notification.time) return notification.time;
    
    const date = new Date(notification.created_at);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }, [notification.time, notification.created_at]);

  const respondToInvitationMutation = useRespondToInvitation();
  const [selectedResponse, setSelectedResponse] = useState<EventResponseStatus | null>(null);

  const handleInvitationResponse = React.useCallback((status: EventResponseStatus, options?: { modifyType: 'this_only' | 'all_future' }) => {
    if (!notification.event?._id) return;
    
    // Prepare mutation variables
    const variables: {
      eventId: string;
      status: string;
      occurrenceDate?: string;
      modifyType?: string;
    } = {
      eventId: notification.event._id,
      status
    };
    
    // Handle recurring events
    if (notification.event.recurrence?.checked && notification.event.start_time && options?.modifyType) {
      variables.occurrenceDate = typeof notification.event.start_time === 'string' 
        ? notification.event.start_time 
        : notification.event.start_time.toISOString();
      variables.modifyType = options.modifyType;
    }
    
    setSelectedResponse(status);
    
    respondToInvitationMutation.mutate(variables, {
      onSuccess: () => {
        // Direct cache update handled automatically by new architecture
        // Local state update for immediate UI feedback
        setInvitationStatus(status as 'accepted' | 'maybe' | 'rejected');
      },
      onError: (error) => {
        console.error('Failed to respond to invitation:', error);
        // Reset selected response on error
        setSelectedResponse(null);
        Alert.alert('Error', 'Failed to respond to invitation. Please try again.');
      }
    });
  }, [notification.event, respondToInvitationMutation]);

  const handleInvitationAlerts = React.useCallback((status: EventResponseStatus) => {
    if (notification.event?.recurrence?.checked && notification.event?.start_time) {
      const statusText = status === 'accepted' ? 'accept' : status === 'maybe' ? 'mark as maybe' : 'decline';
      Alert.alert(
        'Recurring Event',
        `Do you want to ${statusText} this event only or all future events?`,
        [
          { text: 'This Event Only', onPress: () => { handleInvitationResponse(status, { modifyType: 'this_only' }); }},
          { text: 'All Future Events', onPress: () => { handleInvitationResponse(status, { modifyType: 'all_future' }); }}, 
          { text: 'Cancel', style: 'cancel', onPress: () => { }},
        ]
      );
    } else {
      handleInvitationResponse(status);
    }
  }, [notification.event, handleInvitationResponse]);

  const formatEventDateTime = React.useCallback((dateStr?: string) => {
    if (!dateStr) return null;
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return null;
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  const eventDateTimeText = formatEventDateTime(notification.data?.eventStartTime);
  const eventLocationText = notification.data?.eventLocation || notification.location || null;
  const eventCategory = notification.event?.category || notification.data?.eventCategory || null;

  const [invitationStatus, setInvitationStatus] = React.useState< 'pending' | 'accepted' | 'maybe' | 'rejected' >(notification.status as 'pending' | 'accepted' | 'maybe' | 'rejected');

  const statusLabelMap: Record<string, string> = {
    accepted: 'Accepted',
    maybe: 'Maybe',
    rejected: 'Declined'
  } as const;

  // update local status when respond success
  React.useEffect(() => {
    setInvitationStatus(notification.status as 'pending' | 'accepted' | 'maybe' | 'rejected');
  }, [notification.status]);

  const renderInvitationControls = () => {
    if (invitationStatus === 'pending') {
      return (
        <InvitationActionButtons
          loading={respondToInvitationMutation.isPending}
          onAccept={() => {
            handleInvitationAlerts('accepted');
            // Status will be updated in the mutation's onSuccess callback
          }}
          onMaybe={() => {
            handleInvitationAlerts('maybe');
            // Status will be updated in the mutation's onSuccess callback
          }}
          onDecline={() => {
            handleInvitationAlerts('rejected');
            // Status will be updated in the mutation's onSuccess callback
          }}
        />
      );
    }

    // single disabled pill
    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: themeColors.eventCardBackgroundColor,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: 0.7,
        flex: 1,
      }}>
        <ThemedText style={{ fontSize: 11, fontWeight: '600', color: themeColors.text }}>
          {statusLabelMap[invitationStatus]}
        </ThemedText>
      </View>
    );
  };

  const baseOpacity = notification.is_seen || isMarking ? 0.7 : 1.0;
  const pressOpacity = isMarking ? 1 : (notification.is_seen ? 0.3 : 0.5);

  return (
    <TouchableOpacity
      style={{
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        opacity: baseOpacity,
      }}
      onPress={onPress}
      activeOpacity={pressOpacity}
      disabled={isMarking}
    >
      {/* Thumbnail */}
      <View style={{ width: 40, height: 40, marginRight: 12 }}>
        {isMarking ? <ActivityIndicator size="small" color={themeColors.tint} /> : thumbnail}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ 
                color: themeColors.text, 
                fontSize: 16, 
                fontWeight: 'bold',
                flex: 1
              }}>
                {notification.title}
              </Text>
              {/* dot and time handled in right container */}
            </View>
            
            {notification.subtitle && (
              <Text style={{ 
                color: themeColors.text, 
                fontSize: 14, 
                marginBottom: 4,
                opacity: notification.is_seen ? 0.8 : 1.0
              }}>
                {notification.subtitle}
              </Text>
            )}

            {/* Event Info Row */}
            {(eventDateTimeText || eventLocationText) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                {eventDateTimeText && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, marginTop: 2 }}>
                    <Ionicons name="time-outline" size={12} color={themeColors.placeholderTextColor} style={{ marginRight: 2 }} />
                    <ThemedText style={{ fontSize: 12, color: themeColors.placeholderTextColor }}>
                      {eventDateTimeText}
                    </ThemedText>
                  </View>
                )}
                {eventLocationText && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Ionicons name="location-outline" size={12} color={themeColors.placeholderTextColor} style={{ marginRight: 2 }} />
                    <ThemedText style={{ fontSize: 12, color: themeColors.placeholderTextColor }}>
                      {eventLocationText}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}

            {/* Category Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: notification.type === 'event_invitation' ? 8 : 0 }}>
              {eventCategory ? (
                <ThemedText style={{ 
                  paddingVertical: 1,
                  paddingHorizontal: 6,
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: '600',
                  backgroundColor: themeColors.eventCardCategoryColor,
                  borderWidth: 1,
                  borderColor: themeColors.eventCardCategoryBorderColor,
                  color: themeColors.text,
                  overflow: 'hidden',
                  textTransform: 'capitalize',
                  marginRight: 8,
                }}>
                  {eventCategory}
                </ThemedText>
              ) : null}
            </View>

          </View>
          {/* Right Side: time/dot and badge */}
          <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: themeColors.placeholderTextColor, fontSize: 12 }}>
                {displayTime}
              </Text>
              {!notification.is_seen && !isMarking && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: themeColors.tint,
                    marginLeft: 6,
                  }}
                />
              )}
            </View>

            {notification.count && notification.count > 0 && (
              <View
                style={{
                  backgroundColor: '#EF4444',
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 6,
                  marginTop: 4,
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                  {notification.count}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Invitation controls spanning full width */}
        {notification.type === 'event_invitation' && (
          <View>
            {renderInvitationControls()}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

NotificationCard.displayName = 'NotificationCard';

export default NotificationCard; 