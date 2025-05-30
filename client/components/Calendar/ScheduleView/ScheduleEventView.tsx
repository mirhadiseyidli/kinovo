import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { EventOccurrence } from '@/utils/eventUtils';

type ScheduleEventViewProps = {
  title: string;
  time: string;
  location?: string;
  userStatus?: 'pending' | 'maybe' | 'accepted' | 'rejected';
  eventOccurrence?: EventOccurrence;
};

const ScheduleEventView: React.FC<ScheduleEventViewProps> = ({ 
  title, 
  time, 
  location,
  userStatus = 'accepted',
  eventOccurrence
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

  // Determine styling based on user status
  let gradientColors: [string, string] = [themeColors.cardColorsGradientOne, themeColors.cardColorsGradientTwo];
  let gradientOpacity = 0.9;
  let borderWidth = 0;
  let borderColor = 'transparent';
  let titleStyle: any = { 
    color: themeColors.text, 
    fontSize: 16, 
    fontWeight: '600' 
  };

  if (userStatus === 'rejected') {
    gradientColors = ['transparent', 'transparent'];
    gradientOpacity = 1;
    borderWidth = 1;
    borderColor = themeColors.mountainGreen;
    titleStyle = {
      ...titleStyle,
      textDecorationLine: 'line-through',
      opacity: 0.7,
    };
  } else if (userStatus === 'maybe') {
    borderWidth = 1;
    borderColor = themeColors.cardColorsGradientOne;
  }

  const getStatusText = () => {
    switch (userStatus) {
      case 'pending':
        return 'Pending';
      case 'maybe':
        return 'Maybe';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Declined';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (userStatus) {
      case 'pending':
        return themeColors.textThird;
      case 'maybe':
        return themeColors.text;
      case 'accepted':
        return 'white';
      case 'rejected':
        return themeColors.text;
      default:
        return themeColors.textThird;
    }
  };

  const getStatusBackgroundColor = () => {
    switch (userStatus) {
      case 'pending':
        return themeColors.inputBackgroundColor;
      case 'maybe':
        return themeColors.background;
      case 'accepted':
        return themeColors.mountainGreen;
      case 'rejected':
        return 'transparent';
      default:
        return themeColors.inputBackgroundColor;
    }
  };

  const getStatusBorderColor = () => {
    switch (userStatus) {
      case 'pending':
        return themeColors.textThird;
      case 'maybe':
        return themeColors.mountainGreen;
      case 'accepted':
        return themeColors.mountainGreen;
      case 'rejected':
        return themeColors.mountainGreen;
      default:
        return themeColors.textThird;
    }
  };

  const handleEventPress = () => {
    if (!eventOccurrence?.event) return;

    // For recurring event occurrences, use the originalEventId, otherwise use the regular _id
    const eventId = eventOccurrence.event.originalEventId || eventOccurrence.event._id;
    if (!eventId) return;

    // Prepare navigation parameters
    const params: any = { event_id: eventId };

    // For recurring event occurrences, pass the occurrence date information
    const isRecurring = eventOccurrence.event.recurrence?.checked && 
                       eventOccurrence.event.recurrence?.frequency && 
                       eventOccurrence.event.recurrence?.frequency !== 'none';
    
    if (isRecurring && eventOccurrence.event.start_time && eventOccurrence.event.end_time) {
      params.occurrence_start = new Date(eventOccurrence.event.start_time).toISOString();
      params.occurrence_end = new Date(eventOccurrence.event.end_time).toISOString();
      params.is_occurrence = 'true';
    }

    router.push({
      pathname: "/(auth)/(viewEvent)/[event_id]" as const,
      params: params
    });
  };

  return (
    <TouchableOpacity onPress={handleEventPress}>
      <View
        style={{
          padding: 16,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: borderWidth,
          borderColor: borderColor,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 12,
            opacity: gradientOpacity,
          }}
        />
        {/* Striped pattern for 'maybe' status */}
        {userStatus === 'maybe' && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
          }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  width: 3,
                  height: 200,
                  backgroundColor: themeColors.background,
                  transform: [
                    { translateX: i * 12 - 50 },
                    { translateY: -50 },
                    { rotate: '45deg' }
                  ],
                }}
              />
            ))}
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={titleStyle}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Feather name="clock" size={12} color={themeColors.textThird} />
            <Text style={{ 
              color: themeColors.textThird, 
              fontSize: 14, 
              marginLeft: 6,
              opacity: userStatus === 'rejected' ? 0.7 : 1
            }}>
              {time}
            </Text>
          </View>
          {location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Feather name="map-pin" size={12} color={themeColors.textThird} />
              <Text style={{ 
                color: themeColors.textThird, 
                fontSize: 14, 
                marginLeft: 6,
                opacity: userStatus === 'rejected' ? 0.7 : 1
              }}>
                {location}
              </Text>
            </View>
          )}
        </View>
        <View style={{
          backgroundColor: getStatusBackgroundColor(),
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: getStatusBorderColor(),
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Striped pattern for 'maybe' status chip */}
          {userStatus === 'maybe' && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'hidden',
              zIndex: 1,
            }}>
              {Array.from({ length: Math.ceil((100 + 40) / 6) }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: Math.sqrt(100 * 100 + 40 * 40) + 20,
                    backgroundColor: themeColors.mountainGreen,
                    transform: [
                      { translateX: i * 6 - 50 },
                      { translateY: -20 },
                      { rotate: '45deg' }
                    ],
                  }}
                />
              ))}
            </View>
          )}
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: getStatusColor(),
            opacity: userStatus === 'rejected' ? 0.7 : 1,
            zIndex: 2,
            position: 'relative',
          }}>
            {getStatusText()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ScheduleEventView;