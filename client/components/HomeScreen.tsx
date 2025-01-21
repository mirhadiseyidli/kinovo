import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Header from './Header';
import { HomeScreenProps } from '../types/allTypes';
import EventSuggestions from './EventSuggestions';
import UpcomingEvents from './UpcomingEvents';
import FriendsActivity from './FriendsActivity';
import { ThemedView } from './ThemedView';

const HomeScreen = () => {
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > 50); // Toggle button state after a small scroll
  };

  const handleButtonPress = () => {
    if (showScrollToTop) {
      // Scroll to top
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // Create Event Logic
      console.log('Create Event Pressed');
    }
  };

  return (
    <ThemedView className="flex-1 bg-white">
      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 flex-col"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <ThemedView className='flex flex-col gap-0.5'>
          <ThemedView className="flex-[1]">
            <Header />
          </ThemedView>
          {/* <View className='flex-[1] items-center justify-center'>
            <EventSuggestions />
          </View> */}
          <ThemedView className='flex-[1] items-center justify-center'>
            <UpcomingEvents />
          </ThemedView>
          {/* <View className='flex-[1] items-center justify-center'>
            <FriendsActivity />
          </View> */}
        </ThemedView>
      </ScrollView>

      {/* Floating Button */}
      <TouchableOpacity
        onPress={handleButtonPress}
        className="absolute bottom-20 right-6 bg-teal-300 rounded-full p-4 shadow-lg"
      >
        <Feather
          name={showScrollToTop ? 'arrow-up' : 'plus'} // Dynamic icon based on scroll
          size={24}
          color="white"
        />
      </TouchableOpacity>
    </ThemedView>
  );
};

export default HomeScreen;