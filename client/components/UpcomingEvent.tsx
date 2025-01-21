import React from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface UpcomingEventProps {
  friendName: string;
  friendImage: any;
  eventTitle: string;
  date: string;
  time: string;
  location: string;
  remainingDays: string;
  eventImage: any;
}

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

  return (
    <ThemedView className="flex-row overflow-hidden mb-4 bg-transparent items-center">
      {/* Event Image */}
      <ThemedView className="aspect-square h-[100%] mr-4">
        <Image 
          source={eventImage}
          className="w-full h-full rounded-md"
          resizeMode="cover"
        />
      </ThemedView>

      {/* Event Details */}
      <ThemedView className="flex-1 justify-center">
        {/* Friend Info */}
        <ThemedView className="flex-row items-center mb-2 justify-between">
          <ThemedView className='flex-row items-center justify-start'>
            <Image
              source={friendImage}
              className="aspect-square w-[16%] rounded-full mr-2"
            />
            <ThemedText className="text-[12px] font-medium text-gray-800">{friendName}</ThemedText>
          </ThemedView>
          <ThemedView className='flex-row items-center justify-center'>
            <Feather name="clock" size={16} color={Colors[colorScheme ?? 'dark'].tint} className='mr-2'/>
            <ThemedText className="text-[12px] text-green-600 ml-auto">{remainingDays}</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Event Title */}
        <ThemedText className="text-[12px] font-medium text-gray-900 mb-2">{eventTitle}</ThemedText>

        {/* Event Date and Time */}
        <View className="flex-row items-center mb-1">
          <Feather name="clock" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
          <ThemedText className="text-xs text-gray-600 ml-2">
            {date}, {time}
          </ThemedText>
        </View>

        {/* Event Location */}
        <View className="flex-row items-center">
          <Feather name="map-pin" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
          <ThemedText className="text-xs text-gray-600 ml-2">{location}</ThemedText>
        </View>
      </ThemedView>
    </ThemedView>
  );
};

export default UpcomingEvent;