import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Dimensions, Platform, Modal, Animated } from 'react-native';
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
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NearbyEventsProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

const DistanceModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  selectedDistance: number;
  onSelectDistance: (distance: number) => void;
  colorScheme: 'light' | 'dark';
}> = ({ visible, onClose, selectedDistance, onSelectDistance, colorScheme }) => {
  const insets = useSafeAreaInsets();
  const themeColors = Colors[colorScheme];
  const [tempDistance, setTempDistance] = useState(selectedDistance);
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Handle modal animation
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end'
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()}
        >
          <Animated.View
            style={{
              transform: [{ translateY: slideAnim }],
            }}
          >
            <ThemedView style={{
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: insets.bottom,
            }}>
              {/* Drag handle indicator */}
              <View style={{
                alignSelf: 'center',
                width: 50,
                height: 5,
                backgroundColor: themeColors.placeholderTextColor,
                borderRadius: 3,
                marginTop: 8,
                marginBottom: 8,
                opacity: 0.7,
              }} />

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: themeColors.border,
              }}>
                <TouchableOpacity onPress={onClose}>
                  <ThemedText>Cancel</ThemedText>
                </TouchableOpacity>
                <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Distance</ThemedText>
                <TouchableOpacity onPress={() => {
                  onSelectDistance(tempDistance);
                  onClose();
                }}>
                  <ThemedText style={{ color: themeColors.mountainGreen }}>Apply</ThemedText>
                </TouchableOpacity>
              </View>

              <Picker
                selectedValue={tempDistance}
                onValueChange={setTempDistance}
                style={{ 
                  width: '100%',
                  backgroundColor: themeColors.background,
                }}
              >
                {[10, 25, 50, 100, 150, 200].map((distance) => (
                  <Picker.Item 
                    key={distance} 
                    label={`${distance} miles`} 
                    value={distance}
                    color={themeColors.text}
                  />
                ))}
              </Picker>
            </ThemedView>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const NearbyEvents: React.FC<NearbyEventsProps> = ({ refreshing, onFinishRefresh }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDistance, setSelectedDistance] = useState(50);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
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

  const fetchEvents = async () => {
    if(userLocation.lat !== null && userLocation.lng !== null) {
      const fetchedEvents = await fetchNearByEvents(userLocation.lat, userLocation.lng, selectedDistance);
      setNearbyEvents(fetchedEvents ?? []);
      onFinishRefresh();
    }
  }

  // Initial location fetch
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
  }, []);

  // Handle refresh
  useEffect(() => {
    if (refreshing && userLocation.lat !== null && userLocation.lng !== null) {
      fetchEvents();
    }
  }, [refreshing, userLocation]);

  // Initial data fetch when location is available
  useEffect(() => {
    if (userLocation.lat !== null && userLocation.lng !== null) {
      fetchEvents();
    }
  }, [userLocation.lat, userLocation.lng]);

  // Refresh when distance changes
  useEffect(() => {
    if (userLocation.lat !== null && userLocation.lng !== null) {
      fetchEvents();
    }
  }, [selectedDistance]);

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

  return (
    <ThemedView style={{ flex: 1, width: screenWidth }}>
      {/* Header */}
      <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 16 }}>
        <Feather name="map-pin" size={16} color={Colors[colorScheme ?? 'dark'].tint} />
        <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>{userLocation.city}, {userLocation.state}</ThemedText>
      </ThemedView>

      <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 16 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Nearby Events</ThemedText>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={() => setDistanceModalVisible(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 16, marginRight: 8 }}>
              {`${selectedDistance} miles`}
            </ThemedText>
            <Feather name="map" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
          </View>
        </TouchableOpacity>
      </ThemedView>

      <DistanceModal
        visible={distanceModalVisible}
        onClose={() => setDistanceModalVisible(false)}
        selectedDistance={selectedDistance}
        onSelectDistance={(distance) => {
          setSelectedDistance(distance);
          fetchEvents();
        }}
        colorScheme={colorScheme ?? 'dark'}
      />

      {/* Show placeholder when no events */}
      {nearbyEvents.length === 0 ? (
        <ThemedView style={{ width: screenWidth }}>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              flexDirection: 'row', 
              alignItems: 'center', 
              paddingHorizontal: 16, 
              width: screenWidth 
            }}
            onPress={fetchEvents}
          >
            <ThemedView style={{
              flex: 1,
              height: 200,
              backgroundColor: Colors[colorScheme ?? 'dark'].background,
              borderRadius: 12,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: Colors[colorScheme ?? 'dark'].border,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}>
              <IconSymbol
                name="map.fill"
                size={32}
                color={Colors[colorScheme ?? 'dark'].placeholderTextColor}
              />
              <ThemedText style={{ 
                fontSize: 16, 
                textAlign: 'center', 
                marginTop: 12,
                color: Colors[colorScheme ?? 'dark'].textSecondary 
              }}>
                No nearby events found
              </ThemedText>
              <ThemedText style={{ 
                fontSize: 14, 
                textAlign: 'center', 
                marginTop: 8,
                color: Colors[colorScheme ?? 'dark'].textThird 
              }}>
                Tap to refresh
              </ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <>
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
                  />
                </ThemedView>
              ))}

              {/* See More Button as the Last Item */}
              {nearbyEvents.length > 5 && (
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
              )}
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
            {nearbyEvents.length > 5 && (
              <View
                onTouchStart={() => scrollToItem(nearbyEvents.length)}
                style={{
                  height: 8,
                  width: 8,
                  borderRadius: 4,
                  backgroundColor: currentIndex === nearbyEvents.length ? Colors[colorScheme ?? 'dark'].tint : Colors[colorScheme ?? 'dark'].border,
                }}
              />
            )}
          </View>
        </>
      )}
    </ThemedView>
  );
};

export default NearbyEvents;