import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import EventCardView from '@/components/Explore/EventCardView';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';

const bikingTrail = require('@/assets/biking-trail.jpg');
const hikingPlace = require('@/assets/hiking-place.jpg');
const soccerField = require('@/assets/soccer-field.jpg');
const tennisCourt = require('@/assets/tennis-court.jpg');
const conferenceRoom = require('@/assets/conference-room.webp');

const NearbyEvents: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const events = [
    {
      id: 1,
      title: 'Weekend Hike',
      location: 'Green Valley',
      date: 'March 10, 2025',
      time: '8:00 AM',
      imageUrl: hikingPlace,
    },
    {
      id: 2,
      title: 'Morning Cycle',
      location: 'Sunrise Trail',
      date: 'March 11, 2025',
      time: '6:00 AM',
      imageUrl: bikingTrail,
    },
    {
      id: 3,
      title: 'Kayaking Fun',
      location: 'Blue River',
      date: 'March 12, 2025',
      time: '9:00 AM',
      imageUrl: soccerField,
    },
    {
      id: 4,
      title: 'Rock Climbing',
      location: 'Eagle Rock',
      date: 'March 13, 2025',
      time: '7:00 AM',
      imageUrl: tennisCourt,
    },
    {
      id: 5,
      title: 'Camping Trip',
      location: 'Pine Woods',
      date: 'March 14, 2025',
      time: '5:00 PM',
      imageUrl: conferenceRoom,
    },
  ];

  const screenWidth = Dimensions.get('window').width;

  const handleScrollEndDrag = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);

    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
    }

    setCurrentIndex(index);
  };

  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentIndex(index);
  };

  const scrollToItem = (index: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
    }
    setCurrentIndex(index);
  };

  const colorScheme = useColorScheme();

  return (
    <ThemedView 
      className="flex-1"
      style={{ width: screenWidth }}
    >
      {/* Header */}
      <ThemedView className='flex flex-row items-center gap-2 mb-2 px-4'>
        <Feather name="map-pin" size={16} color={Colors[colorScheme ?? 'dark'].tint} />
        <ThemedText className='text-lg font-bold'>San Francisco</ThemedText>
      </ThemedView>
      <ThemedView className="flex-row justify-between items-center mb-4 px-4">
        <ThemedText className="text-md font-bold">Nearby Events</ThemedText>
        <TouchableOpacity className="flex-row items-center">
          <ThemedText className="text-md mr-1">View All</ThemedText>
          <IconSymbol
            name="chevron.right"
            size={12}
            color={Colors[colorScheme ?? 'dark'].tint}
          />
        </TouchableOpacity>
      </ThemedView>

      {/* Horizontal Carousel */}
      <ThemedView style={{ width: screenWidth }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          className="mb-4"
        >
          {events.map((event) => (
            <ThemedView
              className='flex-1 flex-row items-center px-4'
              key={event.id}
              style={{ width: screenWidth }}
            >
              <EventCardView
                title={event.title}
                location={event.location}
                date={event.date}
                time={event.time}
                imageUrl={event.imageUrl}
              />
            </ThemedView>
          ))}

          {/* See More Button as the Last Item */}
          <ThemedView className='items-center justify-center' style={{ width: screenWidth }}>
            <ThemedText 
              className="font-bold p-4 rounded-lg text-center w-[80%]"
              style={{
                backgroundColor: Colors[colorScheme ?? 'dark'].tint,
                color: Colors[colorScheme ?? 'dark'].background
              }}
            >
              See More Events
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </ThemedView>

      {/* Pagination Dots */}
      <View className="flex-row justify-center gap-1">
        {events.map((_, index) => (
          <View
            key={index}
            onTouchStart={() => scrollToItem(index)}
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor:
                currentIndex === index
                  ? Colors[colorScheme ?? 'dark'].tint // Active state
                  : Colors[colorScheme ?? 'dark'].border, // Inactive state
            }}
          />
        ))}

        {/* Dot for See More Button */}
        <View
          onTouchStart={() => scrollToItem(events.length)}
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor:
              currentIndex === events.length
                ? Colors[colorScheme ?? 'dark'].tint // Active state
                : Colors[colorScheme ?? 'dark'].border, // Inactive state
          }}
        />
      </View>
    </ThemedView>
  );
};

export default NearbyEvents;