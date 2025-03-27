import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import EventCardView from '@/components/Explore/EventCardView';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';
import { NearbyEvent } from '@/types/allTypes';
import { ScrollHandlerEvent } from '@/types/allTypes';

const bikingTrail = require('@/assets/biking-trail.jpg');
const hikingPlace = require('@/assets/hiking-place.jpg');
const soccerField = require('@/assets/soccer-field.jpg');
const tennisCourt = require('@/assets/tennis-court.jpg');
const conferenceRoom = require('@/assets/conference-room.webp');

const NearbyEvents: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const events: NearbyEvent[] = [
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

  const handleScrollEndDrag = (event: ScrollHandlerEvent) => {
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

  const handleMomentumScrollEnd = (event: ScrollHandlerEvent) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentIndex(index);
  };

  const scrollToItem = (index: number): void => {
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
    <ThemedView style={{ flex: 1, width: screenWidth }}>
      {/* Header */}
      <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 16 }}>
        <Feather name="map-pin" size={16} color={Colors[colorScheme ?? 'dark'].tint} />
        <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>San Francisco</ThemedText>
      </ThemedView>

      <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 16 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Nearby Events</ThemedText>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 16, marginRight: 4 }}>View All</ThemedText>
          <IconSymbol name="chevron.right" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
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
          style={{ marginBottom: 16 }}
        >
          {events.map((event: NearbyEvent) => (
            <ThemedView key={event.id} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, width: screenWidth }}>
              <EventCardView title={event.title} location={event.location} date={event.date} time={event.time} imageUrl={event.imageUrl} />
            </ThemedView>
          ))}

          {/* See More Button as the Last Item */}
          <ThemedView style={{ alignItems: 'center', justifyContent: 'center', width: screenWidth }}>
            <ThemedText 
              style={{
                fontWeight: 'bold',
                padding: 16,
                borderRadius: 8,
                textAlign: 'center',
                width: '80%',
                backgroundColor: Colors[colorScheme ?? 'dark'].mountainGreen,
                color: Colors[colorScheme ?? 'dark'].text,
              }}
            >
              See More Events
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </ThemedView>

      {/* Pagination Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
        {events.map((_, index) => (
          <View
            key={index}
            onTouchStart={() => scrollToItem(index)}
            style={{
              height: 8,
              width: 8,
              borderRadius: 4,
              backgroundColor: currentIndex === index ? Colors[colorScheme ?? 'dark'].tint : Colors[colorScheme ?? 'dark'].border,
            }}
          />
        ))}

        {/* Dot for See More Button */}
        <View
          onTouchStart={() => scrollToItem(events.length)}
          style={{
            height: 8,
            width: 8,
            borderRadius: 4,
            backgroundColor: currentIndex === events.length ? Colors[colorScheme ?? 'dark'].tint : Colors[colorScheme ?? 'dark'].border,
          }}
        />
      </View>
    </ThemedView>
  );
};

export default NearbyEvents;