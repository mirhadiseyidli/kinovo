import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import SuggestedEvent from './SuggestedEvent';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

const EventSuggestions: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const events = [
    { id: 1, icon: 'calendar', title: 'Weekend Hike', location: 'Green Valley' },
    { id: 2, icon: 'calendar', title: 'Morning Cycle', location: 'Sunrise Trail' },
    { id: 3, icon: 'calendar', title: 'Kayaking Fun', location: 'Blue River' },
    { id: 4, icon: 'calendar', title: 'Rock Climbing', location: 'Eagle Rock' },
    { id: 5, icon: 'calendar', title: 'Camping Trip', location: 'Pine Woods' },
  ];

  const screenWidth = Dimensions.get('window').width;

  const handleScrollEndDrag = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth); // Calculate the closest index

    // Snap to the nearest item
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
    const index = Math.round(offsetX / screenWidth); // Calculate the closest index
    setCurrentIndex(index); // Update the current index
  };

  const scrollToItem = (index: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
    }
    setCurrentIndex(index); // Update the current index
  };

  return (
    <View className="p-4 bg-white">
      {/* Header */}
      <Text className="text-lg font-bold mb-4">Event Suggestions</Text>

      {/* Horizontal Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScrollEndDrag={handleScrollEndDrag} // Trigger snapping after drag
        onMomentumScrollEnd={handleMomentumScrollEnd} // Update current index
        scrollEventThrottle={16}
        className="mb-4"
      >
        {events.map((event) => (
          <View
            key={event.id}
            style={{
              width: screenWidth, // Full width for each event
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <SuggestedEvent
              icon={event.icon}
              title={event.title}
              location={event.location}
            />
          </View>
        ))}

        {/* See More Button as the Last Item */}
        <View
          style={{
            width: screenWidth, // Full width for proper snapping
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <Text className="bg-teal-500 text-white font-bold p-4 rounded-lg text-center w-[90%]">
            See More Events
          </Text>
        </View>
      </ScrollView>

      {/* Pagination Dots */}
      <View className="flex-row justify-center mt-2 gap-1">
        {events.map((_, index) => (
          <View
            key={index}
            onTouchStart={() => scrollToItem(index)} // Allow tapping on dots
            className={`h-2 w-2 rounded-full ${
              currentIndex === index ? 'bg-teal-500' : 'bg-gray-300'
            }`}
          />
        ))}

        {/* Dot for See More Button */}
        <View
          onTouchStart={() => scrollToItem(events.length)} // Scroll to the See More button
          className={`h-2 w-2 rounded-full ${
            currentIndex === events.length ? 'bg-teal-500' : 'bg-gray-300'
          }`}
        />
      </View>
    </View>
  );
};

export default EventSuggestions;