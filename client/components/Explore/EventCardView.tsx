import React from 'react';
import { View, ImageBackground, Dimensions, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BlurView } from 'expo-blur';
import { SuggestedEventProps } from '@/types/allTypes';
import { useRouter } from 'expo-router';

const EventCardView: React.FC<SuggestedEventProps> = ({
  event
}) => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const router = useRouter();

  const backgroundColor =
    colorScheme === 'dark' ? 'rgba(50, 50, 50, 0.6)' : 'rgba(200, 200, 200, 0.6)';

  const handleViewEvent = () => {
    if (event?._id) {
      router.push(`/(auth)/(viewEvent)/${event._id}`);
    }
  }

  const formatDateTime = (date: Date | null) => {
    if (!date) return '';
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const timeStr = dateObj.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${dateStr} • ${timeStr}`;
  }

  return (
    <TouchableOpacity onPress={handleViewEvent}>
      <ImageBackground
        source={event?.event_picture ? { uri: event.event_picture } : require('@/assets/event-default.png')}
        resizeMode="cover"
        style={{
          width: screenWidth * 0.92,
          borderRadius: 16,
          overflow: 'hidden',
          aspectRatio: 1.9,
          alignSelf: 'center',
          marginVertical: 8,
        }}
      >
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
          {/* Event Details */}
          <ThemedText style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
            {event?.title || 'Untitled Event'}
          </ThemedText>
          
          {event?.location?.text && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Feather name="map-pin" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
              <ThemedText style={{ fontSize: 12, marginLeft: 6 }}>
                {event.location.text}
              </ThemedText>
            </View>
          )}
          
          {event?.start_time && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="clock" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
              <ThemedText style={{ fontSize: 12, marginLeft: 6 }}>
                {formatDateTime(event.start_time)}
              </ThemedText>
            </View>
          )}
        </BlurView>
      </ImageBackground>
    </TouchableOpacity>
  );
};

export default EventCardView;