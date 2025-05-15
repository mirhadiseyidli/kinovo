import React, { useState, useRef, useEffect } from 'react';
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
import * as Location from 'expo-location';
import { useGetNearByEvents } from '@/hooks/useGetNearByEvents';
import { Event } from '@/types/allTypes';

const NearbyEvents: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const screenWidth = Dimensions.get('window').width;
  const scrollRef = useRef<ScrollView>(null);
  const colorScheme = useColorScheme();
  const [userLocation, setUserLocation] = useState<{ city: string; state: string; lat: number | null; lng: number | null }>({
    city: 'San Francisco',
    state: 'CA',
    lat: null,
    lng: null,
  });
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const { fetchNearByEvents, loading } = useGetNearByEvents();

  useEffect(() => {
    // Fetch event details using the eventId (dummy example)
    const getEventData = async () => {
      if(userLocation.lat !== null && userLocation.lng !== null) {
        const fetchedEvents = await fetchNearByEvents(userLocation.lat, userLocation.lng);
        setNearbyEvents(fetchedEvents ?? []);
      }
    }
    
    getEventData();
  }, [userLocation]);

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
  
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync(location.coords);
      if (geocode.length > 0) {
        setUserLocation({
          city: geocode[0].city || 'Unknown',
          state: geocode[0].region || 'Unknown',
          lat: location.coords.latitude || null,
          lng: location.coords.longitude || null
        });
      }
    })();
  }, [location]);

  return (
    <ThemedView style={{ flex: 1, width: screenWidth }}>
      {/* Header */}
      <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 16 }}>
        <Feather name="map-pin" size={16} color={Colors[colorScheme ?? 'dark'].tint} />
        <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>{userLocation.city}, {userLocation.state}</ThemedText>
      </ThemedView>

      <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 16 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Nearby Events</ThemedText>
      </ThemedView>

      {/* Horizontal Carousel */}
      <ThemedView style={{ width: screenWidth }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          style={{ marginBottom: 16 }}
        >
          {nearbyEvents.map((event) => (
            <ThemedView key={event._id} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, width: screenWidth }}>
              <EventCardView 
                event={event}
                // title={event.title} 
                // location={event.location.text} 
                // date={event.start_time ? new Date(event.start_time) : null} 
                // time={event.start_time ? new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} 
                // imageUrl={event.event_picture} 
                // imageUrl={require('@/assets/event-default.png')} 
              />
            </ThemedView>
          ))}

          {/* See More Button as the Last Item */}
          <TouchableOpacity style={{ alignItems: 'center', justifyContent: 'center', width: screenWidth }}>
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
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>

      {/* Pagination Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
        {nearbyEvents.map((_, index) => (
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
          onTouchStart={() => scrollToItem(nearbyEvents.length)}
          style={{
            height: 8,
            width: 8,
            borderRadius: 4,
            backgroundColor: currentIndex === nearbyEvents.length ? Colors[colorScheme ?? 'dark'].tint : Colors[colorScheme ?? 'dark'].border,
          }}
        />
      </View>
    </ThemedView>
  );
};

export default NearbyEvents;