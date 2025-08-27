import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { EventOccurrence } from '@/utils/eventUtils';
import { SkeletonBox } from '@/components/Skeleton';
import { ImageBackground } from 'expo-image';
import { getCategoryImage } from '@/constants/CategoryImages';

type ScheduleEventViewProps = {
  title: string;
  time: string;
  endTime: Date;
  location?: string;
  userStatus?: 'pending' | 'maybe' | 'accepted' | 'rejected';
  eventOccurrence?: EventOccurrence;
  onPress?: () => void;
};

const ScheduleEventView: React.FC<ScheduleEventViewProps> = ({ 
  title, 
  time, 
  endTime,
  location,
  userStatus = 'accepted',
  eventOccurrence,
  onPress
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // Don't subscribe to event updates in individual event components
  // This prevents excessive subscriptions and duplication issues
  // Event updates are handled at the context level

  // Memoize title style based on user status
  const titleStyle = useMemo(() => {
    const baseStyle = { 
      color: 'white', 
      marginBottom: 10,
      fontSize: 16, 
      fontWeight: '600' as const
    };

    if (userStatus === 'rejected') {
      return {
        ...baseStyle,
        textDecorationLine: 'line-through' as const,
        opacity: 0.7,
      };
    }
    return baseStyle;
  }, [themeColors.text, userStatus]);

  // Memoize all status-related values to prevent recalculation
  const statusConfig = useMemo(() => {
    switch (userStatus) {
      case 'pending':
        return {
          text: 'Pending',
          color: themeColors.text,
          backgroundColor: themeColors.background,
          borderColor: themeColors.mountainGreen
        };
      case 'maybe':
        return {
          text: 'Maybe',
          color: 'white',
          backgroundColor: themeColors.maybeStatusColor + '50',
          borderColor: themeColors.maybeStatusColor
        };
      case 'accepted':
        return {
          text: 'Accepted',
          color: 'white',
          backgroundColor: themeColors.mountainGreen,
          borderColor: themeColors.mountainGreen
        };
      case 'rejected':
        return {
          text: 'Declined',
          color: themeColors.text,
          backgroundColor: themeColors.background,
          borderColor: themeColors.border
        };
      default:
        return {
          text: '',
          color: themeColors.textThird,
          backgroundColor: themeColors.inputBackgroundColor,
          borderColor: themeColors.textThird
        };
    }
  }, [userStatus, themeColors]);

  const handleEventPress = useCallback(() => {
    if (onPress) {
      onPress();
    }
  }, [onPress]);

  // Memoize truncated location to prevent recalculation
  const truncatedLocation = useMemo(() => {
    if (!location) return null;
    return location.length > 22 ? location.slice(0, 22) + '...' : location;
  }, [location]);

  const isPast = useMemo(() => endTime < new Date(), [endTime]);

  // Memoize image source to prevent unnecessary recalculations
  const imageSource = useMemo(() => {
    return getCategoryImage(eventOccurrence?.event?.category);
  }, [eventOccurrence?.event?.category]);

  // Memoize container styles
  const containerStyle = useMemo(() => ({
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    overflow: 'hidden' as const,
    opacity: isPast ? 0.5 : 1,
    backgroundColor: themeColors.eventCardBackgroundColor,
  }), [isPast, themeColors.eventCardBackgroundColor]);

  // Memoize gradient colors
  const gradientColors = useMemo(() => [
    themeColors.pastEventGradientOne, 
    themeColors.pastEventGradientTwo
  ] as const, []);

  return (
    <TouchableOpacity onPress={onPress ? handleEventPress : undefined}>
      <ImageBackground
        source={imageSource}
        style={containerStyle}
        contentFit="cover"
        onError={() => {
          return <SkeletonBox width={400} height={120} borderRadius={12} />;
        }}
        onProgress={() => {
          return <SkeletonBox width={400} height={120} borderRadius={12} />;
        }}
        cachePolicy="disk"
        allowDownscaling={true}
        imageStyle={{
          bottom: -160,
        }}
      >
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <LinearGradient
            colors={gradientColors}
            style={{ flex: 1 }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={titleStyle}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Feather name="clock" size={12} color={'white'} />
            <Text style={{ 
              color: 'white', 
              fontSize: 14, 
              marginLeft: 6,
              opacity: userStatus === 'rejected' ? 0.7 : 1
            }}>
              {time}
            </Text>
          </View>
          {location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Feather name="map-pin" size={12} color={'white'} />
              <Text style={{ 
                color: 'white', 
                fontSize: 14, 
                marginLeft: 6,
                opacity: userStatus === 'rejected' ? 0.7 : 1
              }}>
                {truncatedLocation}
              </Text>
            </View>
          )}
        </View>
        <View style={{
          backgroundColor: statusConfig.backgroundColor,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: statusConfig.borderColor,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: statusConfig.color,
            opacity: userStatus === 'rejected' ? 0.7 : 1,
            zIndex: 2,
            position: 'relative',
          }}>
            {statusConfig.text}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

export default React.memo(ScheduleEventView, (prevProps, nextProps) => {
  // Check primitive props
  if (
    prevProps.title !== nextProps.title ||
    prevProps.time !== nextProps.time ||
    prevProps.location !== nextProps.location ||
    prevProps.userStatus !== nextProps.userStatus
  ) {
    return false;
  }

  // Check endTime
  if (prevProps.endTime.getTime() !== nextProps.endTime.getTime()) {
    return false;
  }

  // Check eventOccurrence deeply
  const prevOccurrence = prevProps.eventOccurrence;
  const nextOccurrence = nextProps.eventOccurrence;
  
  if (!prevOccurrence && !nextOccurrence) return true;
  if (!prevOccurrence || !nextOccurrence) return false;
  
  if (prevOccurrence.id !== nextOccurrence.id) return false;
  
  const prevEvent = prevOccurrence.event;
  const nextEvent = nextOccurrence.event;
  
  if (!prevEvent && !nextEvent) return true;
  if (!prevEvent || !nextEvent) return false;
  
  return (
    prevEvent._id === nextEvent._id &&
    prevEvent.title === nextEvent.title &&
    prevEvent.start_time === nextEvent.start_time &&
    prevEvent.end_time === nextEvent.end_time &&
    prevEvent.category === nextEvent.category &&
    prevEvent.userStatus === nextEvent.userStatus &&
    prevEvent.location?.text === nextEvent.location?.text
  );
});