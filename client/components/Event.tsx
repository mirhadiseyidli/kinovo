import React from 'react';
import { View, Text, Image, Dimensions, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { UpcomingEventProps } from '@/types/allTypes';

const UpcomingEvent: React.FC<UpcomingEventProps> = ({
  friendName,
  friendImage,
  eventTitle,
  date,
  time,
  location,
  remainingDays,
  eventImage,
}) => {
  
  const colorScheme = useColorScheme();
  const { width } = Dimensions.get('window');
  const height = width / 4;


  return (
    <TouchableOpacity style={{ flexDirection: 'row', width: '100%', overflow: 'hidden', backgroundColor: 'transparent', alignItems: 'center' }}>
      {/* Event Image */}
      <ThemedView style={{ width: height ,height: height, marginRight: 16 }}>
        <Image 
          source={eventImage}
          style={{ width: '100%', height: '100%', borderRadius: 8 }}
          resizeMode="cover"
        />
      </ThemedView>

      {/* Event Details */}
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        {/* Friend Info */}
        <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
          <ThemedView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
            <Image
              source={friendImage}
              style={{ aspectRatio: 1, width: '16%', borderRadius: 50, marginRight: 8 }}
            />
            <ThemedText style={{ fontSize: 12, fontWeight: '500', color: `${Colors[colorScheme ?? 'dark'].tint}` }}>{friendName}</ThemedText>
          </ThemedView>
          <ThemedView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="clock" size={16} color={Colors[colorScheme ?? 'dark'].tint} style={{ marginRight: 8 }} />
            <ThemedText style={{ fontSize: 12, color: `${Colors[colorScheme ?? 'dark'].tint}`, marginLeft: 'auto' }}>{remainingDays}</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Event Title */}
        <ThemedText style={{ fontSize: 12, fontWeight: '500', color: `${Colors[colorScheme ?? 'dark'].tint}`, marginBottom: 8 }}>{eventTitle}</ThemedText>

        {/* Event Date and Time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Feather name="clock" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
          <ThemedText style={{ fontSize: 10, color: `${Colors[colorScheme ?? 'dark'].tint}`, marginLeft: 8 }}>
            {date}, {time}
          </ThemedText>
        </View>

        {/* Event Location */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Feather name="map-pin" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
          <ThemedText style={{ fontSize: 10, color: `${Colors[colorScheme ?? 'dark'].tint}`, marginLeft: 8 }}>{location}</ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
};

export default UpcomingEvent;
