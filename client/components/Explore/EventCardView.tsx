import React from 'react';
import { View, ImageBackground, Dimensions, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BlurView } from 'expo-blur';
import { SuggestedEventProps } from '@/types/allTypes';
import { useRouter } from 'expo-router';
import { getCategoryImage } from '@/constants/CategoryImages';
import DefaultProfilePicture from '../DefaultProfilePicture';

const EventCardView: React.FC<SuggestedEventProps> = ({
  event
}) => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const router = useRouter();

  const backgroundColor =
    colorScheme === 'dark' ? 'rgba(50, 50, 50, 0.6)' : 'rgba(200, 200, 200, 0.6)';

  const handleViewEvent = () => {
    if (!event) return;

    // For recurring event occurrences, use the originalEventId, otherwise use the regular _id
    const eventId = event.originalEventId || event._id;
    if (!eventId) return;

    // Prepare navigation parameters
    const params: any = { event_id: eventId };

    // For recurring event occurrences, pass the occurrence date information
    if (event.isRecurringOccurrence && event.start_time && event.end_time) {
      params.occurrence_start = new Date(event.start_time).toISOString();
      params.occurrence_end = new Date(event.end_time).toISOString();
      params.is_occurrence = 'true';
    }

    router.push({
      pathname: "/(auth)/viewEvent/[event_id]" as const,
      params: params
    });
  }

  const formatDateTime = (date: Date | null) => {
    if (!date) return '';
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const timeStr = dateObj.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${dateStr} • ${timeStr}`;
  }

  const truncateName = (name: string, maxLength: number) => {
    return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
  };

  return (
    <TouchableOpacity onPress={handleViewEvent}>
      <ImageBackground
        source={event?.event_picture ? { uri: event.event_picture } : getCategoryImage(event?.category)}
        resizeMode="cover"
        style={{
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          aspectRatio: 2.2,
          alignSelf: 'center',
          marginVertical: 8,
        }}
      >
        {/* Category chip */}
        <View style={{
          position: 'absolute',
          top: 12,
          right: 12,
          backgroundColor: Colors[colorScheme ?? 'dark'].mountainGreen,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 4,
          zIndex: 1,
        }}>
          <ThemedText style={{ 
            fontSize: 10, 
            fontWeight: 'bold', 
            textTransform: 'capitalize',
            color: '#FFFFFF' // White text for better contrast on mountain green
          }}>
            {event?.category?.toLowerCase() || 'Other'}
          </ThemedText>
        </View>

        {/* Blurry Overlay */}
        <BlurView
          intensity={50}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={{
            backgroundColor,
            width: '100%',
            position: 'absolute',
            bottom: 0,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Event Details */}
            <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <ThemedText style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
                {event?.title || 'Untitled Event'}
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <DefaultProfilePicture
                  profilePicture={event?.creator?.profile_picture}
                  fullName={event?.creator?.full_name}
                  size={16}
                  borderRadius={8}
                />
                <ThemedText style={{ fontSize: 12 }}>
                  {event?.creator?.full_name}
                </ThemedText>
              </View>
            </View>
            
            <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              {event?.location?.text && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Feather name="map-pin" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
                  <ThemedText style={{ fontSize: 12, marginLeft: 6 }}>
                    {truncateName(event.location.text, 22)}
                  </ThemedText>
                </View>
              )}
              {event?.start_time && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Feather name="clock" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
                  <ThemedText style={{ fontSize: 12, marginLeft: 6 }}>
                    {formatDateTime(event.start_time)}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </BlurView>
      </ImageBackground>
    </TouchableOpacity>
  );
};

export default EventCardView;