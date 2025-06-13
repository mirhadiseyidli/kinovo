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
  let titleStyle: any = { 
    color: themeColors.text, 
    fontSize: 16, 
    fontWeight: '600' 
  };

  if (userStatus === 'rejected') {
    titleStyle = {
      ...titleStyle,
      textDecorationLine: 'line-through',
      opacity: 0.7,
    };
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
        return themeColors.text;
      case 'maybe':
        return 'white';
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
        return themeColors.background;
      case 'maybe':
        return themeColors.maybeStatusColor;
      case 'accepted':
        return themeColors.mountainGreen;
      case 'rejected':
        return themeColors.background;
      default:
        return themeColors.inputBackgroundColor;
    }
  };

  const getStatusBorderColor = () => {
    switch (userStatus) {
      case 'pending':
        return themeColors.mountainGreen;
      case 'maybe':
        return themeColors.maybeStatusColor;
      case 'accepted':
        return themeColors.mountainGreen;
      case 'rejected':
        return themeColors.border;
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

  const truncateName = (name: string, maxLength: number) => {
    return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
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
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: themeColors.eventCardBackgroundColor,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={titleStyle}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Feather name="clock" size={12} color={themeColors.textSecondary} />
            <Text style={{ 
              color: themeColors.textSecondary, 
              fontSize: 14, 
              marginLeft: 6,
              opacity: userStatus === 'rejected' ? 0.7 : 1
            }}>
              {time}
            </Text>
          </View>
          {location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Feather name="map-pin" size={12} color={themeColors.textSecondary} />
              <Text style={{ 
                color: themeColors.textThird, 
                fontSize: 14, 
                marginLeft: 6,
                opacity: userStatus === 'rejected' ? 0.7 : 1
              }}>
                {truncateName(location, 22)}
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