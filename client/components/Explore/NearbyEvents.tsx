import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import CityLocationModal from './CityLocationModal';
import { EventCardSkeleton, SkeletonBox } from '../Skeleton';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

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
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const scrollRef = useRef<ScrollView>(null);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{ city: string; state: string; lat: number | null; lng: number | null; text?: string }>({
    city: 'San Francisco',
    state: 'CA',
    lat: 37.7749,
    lng: -122.4194,
    text: 'San Francisco, CA'
  });
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [totalEventCount, setTotalEventCount] = useState(0);
  const { fetchNearByEventsPreview, loading, isFirstFetch } = useGetNearByEvents();
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDataReady, setIsDataReady] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (userLocation.lat !== null && userLocation.lng !== null) {
      try {
        const result = await fetchNearByEventsPreview(userLocation.lat, userLocation.lng, selectedDistance);
        if (result && typeof result === 'object' && 'events' in result) {
          setNearbyEvents(result.events ?? []);
          setTotalEventCount(result.totalCount ?? 0);
        } else {
          setNearbyEvents([]);
          setTotalEventCount(0);
        }
        setIsDataReady(true);
      } finally {
        onFinishRefresh();
      }
    }
  }, [userLocation.lat, userLocation.lng, selectedDistance, fetchNearByEventsPreview, onFinishRefresh]);

  // Debounced fetch function
  const debouncedFetch = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      setIsDataReady(false);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      fetchEvents();
    }, 300);
  }, [fetchEvents]);

  // Initial location fetch
  useEffect(() => {
    setIsDataReady(false);
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // If location permission not granted, use default San Francisco location
          return;
        }
        
        let location = await Location.getCurrentPositionAsync({});
        let geocode = await Location.reverseGeocodeAsync(location.coords);
        
        if (geocode.length > 0) {
          setUserLocation({
            city: geocode[0].city || 'San Francisco',
            state: geocode[0].region || 'CA',
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            text: `${geocode[0].city || 'San Francisco'}, ${geocode[0].region || 'CA'}`
          });
        }
      } catch (error) {
        console.error('Error getting location:', error);
        // Use default San Francisco location on error
      }
    })();
  }, []);

  // Combined effect for all fetch triggers
  useEffect(() => {
    setIsDataReady(false);
    if (userLocation.lat !== null && userLocation.lng !== null) {
      debouncedFetch();
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [userLocation.lat, userLocation.lng, selectedDistance, refreshing]);

  // Auto-recovery when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (userLocation.lat !== null && userLocation.lng !== null) {
        setIsDataReady(false);
        debouncedFetch();
      }
    }, [debouncedFetch, userLocation])
  );

  const shouldShowSkeleton = isFirstFetch && loading;

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

  const handleSelectLocation = (location: { city: string; state: string; lat: number; lng: number; text: string }) => {
    setUserLocation(location);
    // Events will be fetched automatically by the useEffect that watches userLocation changes
  };

  const handleSeeMorePress = () => {
    router.push({
      pathname: '/(auth)/(nearbyEvents)/[distance]',
      params: {
        distance: selectedDistance.toString(),
        lat: userLocation.lat?.toString() || '',
        lng: userLocation.lng?.toString() || '',
        city: userLocation.city,
        state: userLocation.state
      }
    });
  };

  // Calculate total items for pagination (5 events + see more if there are more than 5)
  const totalItems = nearbyEvents.length + (totalEventCount > 5 ? 1 : 0);

  return (
    <ThemedView style={{ flex: 1, width: screenWidth }}>
      {/* Header */}
      <ThemedView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 16 }}>
        {shouldShowSkeleton ? (
          <SkeletonBox width={140} height={20} borderRadius={4} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="map-pin" size={16} color={themeColors.tint} />
            <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>{userLocation.city}, {userLocation.state}</ThemedText>
          </View>
        )}
        <TouchableOpacity
          onPress={() => setCityModalVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4
          }}
        >
          <ThemedText style={{ fontSize: 14 }}>City</ThemedText>
          <Feather name="globe" size={16} color={themeColors.tint} />
        </TouchableOpacity>
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
            <Feather name="map" size={14} color={themeColors.tint} />
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

      <CityLocationModal
        visible={cityModalVisible}
        onClose={() => setCityModalVisible(false)}
        onSelectLocation={handleSelectLocation}
      />

      {/* Show placeholder when no events */}
      {shouldShowSkeleton ? (
        <ThemedView style={{ paddingHorizontal: 16 }}>
          <SkeletonBox width={'100%'} height={172} borderRadius={16} />
          <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
            <SkeletonBox width={22} height={8} borderRadius={999} />
          </View>
        </ThemedView>
      ) : (
        nearbyEvents.length === 0 ? (
        <ThemedView style={{ width: screenWidth }}>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              flexDirection: 'row', 
              alignItems: 'center', 
              paddingHorizontal: 16, 
              width: screenWidth,
              marginTop: 8
            }}
            onPress={fetchEvents}
          >
            <ThemedView style={{
              flex: 1,
              height: 164,
              backgroundColor: themeColors.background,
              borderRadius: 12,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: themeColors.border,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}>
              <IconSymbol
                name="map.fill"
                size={32}
                color={themeColors.placeholderTextColor}
              />
              <ThemedText style={{ 
                fontSize: 16, 
                textAlign: 'center', 
                marginTop: 12,
                color: themeColors.textSecondary 
              }}>
                No nearby events found
              </ThemedText>
              <ThemedText style={{ 
                fontSize: 14, 
                textAlign: 'center', 
                marginTop: 8,
                color: themeColors.textThird 
              }}>
                Tap to refresh
              </ThemedText>
            </ThemedView>
          </TouchableOpacity>
          <View style={{
            height: 8,
            width: 22,
            backgroundColor: themeColors.inputBackgroundColor,
            marginTop: 24,
            borderRadius: 999,
            alignSelf: 'center'
          }} />
        </ThemedView>
      ) :
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
              {totalEventCount > 5 && (
                <TouchableOpacity 
                  style={{ alignItems: 'center', justifyContent: 'center', width: screenWidth, paddingHorizontal: 16 }}
                  onPress={handleSeeMorePress}
                >
                  <ThemedView 
                    style={{
                      width: '100%',
                      height: 140,
                      backgroundColor: themeColors.mountainGreen,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                    }}
                  >
                    <Feather name="plus-circle" size={32} color="white" style={{ marginBottom: 8 }} />
                    <ThemedText 
                      style={{
                        fontWeight: 'bold',
                        fontSize: 18,
                        textAlign: 'center',
                        color: 'white',
                        marginBottom: 4
                      }}
                    >
                      See More Events
                    </ThemedText>
                    <ThemedText 
                      style={{
                        fontSize: 14,
                        textAlign: 'center',
                        color: 'white',
                        opacity: 0.9
                      }}
                    >
                      {totalEventCount - 5} more nearby
                    </ThemedText>
                  </ThemedView>
                </TouchableOpacity>
              )}
            </ScrollView>
          </ThemedView>

          {/* Pagination Dots */}
          {totalItems > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              {Array.from({ length: totalItems }, (_, index) => (
                <TouchableOpacity 
                  key={index}
                  onPress={() => scrollToItem(index)}
                >
                  <View
                    style={{
                      width: currentIndex === index ? 20 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: currentIndex === index ? Colors[colorScheme ?? 'dark'].mountainGreen : Colors[colorScheme ?? 'dark'].border,
                    }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </ThemedView>
  );
};

export default NearbyEvents;