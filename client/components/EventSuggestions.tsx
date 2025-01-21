import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import SuggestedEvent from './SuggestedEvent';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

const bikingTrail = require('../assets/biking-trail.jpg');
const hikingPlace = require('../assets/hiking-place.jpg');
const soccerField = require('../assets/soccer-field.jpg');
const tennisCourt = require('../assets/tennis-court.jpg');
const conferenceRoom = require('../assets/conference-room.webp');

const EventSuggestions: React.FC = () => {
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

  return (
    <ThemedView className="p-4 items-center bg-white">
      {/* Header */}
      <ThemedView style={{ width: screenWidth * 0.9 }}>
        <ThemedText className="text-lg font-bold mb-4 text-start">Event Suggestions</ThemedText>
      </ThemedView>

      {/* Horizontal Carousel */}
      <ThemedView className="mx-auto" style={{ width: screenWidth }}>
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
              className='shadow-md shadow-gray-100 justify-center items-center'
              key={event.id}
              style={{ width: screenWidth }}
            >
              <SuggestedEvent
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
            <ThemedText className="bg-teal-500 text-white font-bold p-4 rounded-lg text-center w-[80%]">
              See More Events
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </ThemedView>

      {/* Pagination Dots */}
      <ThemedView className="flex-row justify-center mt-2 gap-1">
        {events.map((_, index) => (
          <ThemedView
            key={index}
            onTouchStart={() => scrollToItem(index)}
            className={`h-2 w-2 rounded-full ${
              currentIndex === index ? 'bg-teal-500' : 'bg-gray-300'
            }`}
          />
        ))}

        {/* Dot for See More Button */}
        <ThemedView
          onTouchStart={() => scrollToItem(events.length)}
          className={`h-2 w-2 rounded-full ${
            currentIndex === events.length ? 'bg-teal-500' : 'bg-gray-300'
          }`}
        />
      </ThemedView>
    </ThemedView>
  );
};

export default EventSuggestions;