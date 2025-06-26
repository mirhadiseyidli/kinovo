import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Animated, Dimensions, Modal, Pressable, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '@/utils/api';

type PlaceSuggestion = {
  placePrediction: {
    text: {
      text: string;
    };
    placeId: string;
  };
};

type PlaceDetails = {
  location: {
    latitude: number;
    longitude: number;
  };
  addressComponents: {
    longText: string;
    types: string[];
  }[];
};

interface CityLocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: {
    city: string;
    state: string;
    lat: number;
    lng: number;
    text: string;
  }) => void;
}

const CityLocationModal: React.FC<CityLocationModalProps> = ({
  visible,
  onClose,
  onSelectLocation,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const insets = useSafeAreaInsets();

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
      setSearchQuery('');
      setLocationSuggestions([]);
      setIsSearching(false);
    }
  }, [visible, slideAnim]);

  const fetchLocationSuggestions = async (text: string) => {
    if (!text.trim()) {
      setLocationSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsLoading(true);
    const inputData = {
      input: text,
      includedPrimaryTypes: ["locality"]
    };

    try {
      const response = await api.post('/api/google/places/autocomplete', inputData);
      const data = response.data;
      setLocationSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setLocationSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getLongitudeAndLatitude = async (id: string) => {
    try {
      const response = await api.get(`/api/google/places/${id}`, {
        params: {
          fields: 'location,addressComponents'
        }
      });

      const data = response.data as PlaceDetails;

      const cityComponent = data.addressComponents.find((component) =>
        component.types.includes("locality")
      );

      const stateComponent = data.addressComponents.find((component) =>
        component.types.includes("administrative_area_level_1")
      );

      return {
        city: cityComponent?.longText || null,
        state: stateComponent?.longText || null,
        latitude: data.location?.latitude || null,
        longitude: data.location?.longitude || null,
      };
    } catch (error) {
      console.error("Error fetching location coordinates:", error);
      return null;
    }
  };

  const handleLocationSelect = async (location: string, id: string) => {
    setIsLoading(true);
    const locationData = await getLongitudeAndLatitude(id);
    
    if (!locationData) {
      console.error("Failed to fetch location data.");
      setIsLoading(false);
      return;
    }

    const { city, state, latitude, longitude } = locationData;
    
    if (city && state && latitude && longitude) {
      onSelectLocation({
        city,
        state,
        lat: latitude,
        lng: longitude,
        text: location
      });
    }
    
    setIsLoading(false);
    onClose();
  };

  const getCurrentLocation = async () => {
    setIsLoadingCurrentLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        // If location permission is not granted, use default location (San Francisco)
        onSelectLocation({
          city: 'San Francisco',
          state: 'CA',
          lat: 37.7749,
          lng: -122.4194,
          text: 'San Francisco, CA'
        });
        onClose();
        return;
      }
      
      let location = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync(location.coords);
      
      if (geocode.length > 0) {
        onSelectLocation({
          city: geocode[0].city || 'San Francisco',
          state: geocode[0].region || 'CA',
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          text: `${geocode[0].city || 'San Francisco'}, ${geocode[0].region || 'CA'}`
        });
      } else {
        // Fallback to default location if geocoding fails
        onSelectLocation({
          city: 'San Francisco',
          state: 'CA',
          lat: 37.7749,
          lng: -122.4194,
          text: 'San Francisco, CA'
        });
      }
      onClose();
    } catch (error) {
      console.error('Error getting current location:', error);
      // Fallback to default location on error
      onSelectLocation({
        city: 'San Francisco',
        state: 'CA',
        lat: 37.7749,
        lng: -122.4194,
        text: 'San Francisco, CA'
      });
      onClose();
    } finally {
      setIsLoadingCurrentLocation(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={!isSearching}
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle={isSearching ? 'fullScreen' : 'overFullScreen'}
    >
      {isSearching ? (
        // Full screen mode when searching
        <ThemedView style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}>
          {/* Full screen header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
          }}>
                         <TouchableOpacity onPress={() => {
               setSearchQuery('');
               setLocationSuggestions([]);
               setIsSearching(false);
             }}>
               <Feather name="chevron-left" size={24} color={themeColors.text} />
             </TouchableOpacity>
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>Search Cities</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <ThemedText style={{ color: themeColors.mountainGreen }}>Done</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Search input - full width */}
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: themeColors.inputBackgroundColor,
              borderRadius: 8,
              paddingHorizontal: 12,
              height: 44,
            }}>
              <Feather name="search" size={16} color={themeColors.placeholderTextColor} />
              <TextInput
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  fetchLocationSuggestions(text);
                }}
                placeholder="Search for a city..."
                placeholderTextColor={themeColors.placeholderTextColor}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontSize: 16,
                  color: themeColors.text,
                }}
                returnKeyType="search"
                autoCapitalize="words"
                autoFocus={true}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => {
                  setSearchQuery('');
                  setLocationSuggestions([]);
                  fetchLocationSuggestions('');
                }}>
                  <Feather name="x" size={16} color={themeColors.placeholderTextColor} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Search results - full screen */}
          <ScrollView style={{ flex: 1 }}>
            {isLoading && !isLoadingCurrentLocation ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={themeColors.mountainGreen} />
              </View>
            ) : locationSuggestions.length > 0 ? (
              locationSuggestions.map((suggestion: PlaceSuggestion, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderBottomWidth: index !== locationSuggestions.length - 1 ? 1 : 0,
                    borderBottomColor: themeColors.border,
                  }}
                  onPress={() => handleLocationSelect(suggestion.placePrediction.text.text, suggestion.placePrediction.placeId)}
                >
                  <Feather name="map-pin" size={16} color={themeColors.text} style={{ marginRight: 12 }} />
                  <ThemedText style={{ fontSize: 16 }}>{suggestion.placePrediction.text.text}</ThemedText>
                </TouchableOpacity>
              ))
            ) : searchQuery !== '' ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <ThemedText style={{ color: themeColors.textSecondary }}>No cities found</ThemedText>
              </View>
            ) : (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <ThemedText style={{ color: themeColors.textSecondary }}>Type to search for cities</ThemedText>
              </View>
            )}
          </ScrollView>
        </ThemedView>
      ) : (
        // Original bottom sheet mode when not searching
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
                paddingBottom: insets.bottom + 20,
                maxHeight: Dimensions.get('window').height * 0.8,
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
                <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Select City</ThemedText>
                <View style={{ width: 50 }} />
              </View>

              {/* Search input */}
              <View style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: themeColors.border,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: themeColors.inputBackgroundColor,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  height: 44,
                }}>
                  <Feather name="search" size={16} color={themeColors.placeholderTextColor} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      fetchLocationSuggestions(text);
                    }}
                    placeholder="Search for a city..."
                    placeholderTextColor={themeColors.placeholderTextColor}
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      fontSize: 16,
                      color: themeColors.text,
                    }}
                    returnKeyType="search"
                    autoCapitalize="words"
                    onFocus={() => setIsSearching(true)}
                  />
                  {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Feather name="x" size={16} color={themeColors.placeholderTextColor} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Current location button */}
              <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: themeColors.border,
                }}
                onPress={getCurrentLocation}
                disabled={isLoadingCurrentLocation}
              >
                <Feather name="map-pin" size={16} color={themeColors.mountainGreen} style={{ marginRight: 12 }} />
                <ThemedText style={{ flex: 1, fontWeight: '500' }}>Use my current location</ThemedText>
                {isLoadingCurrentLocation && (
                  <ActivityIndicator size="small" color={themeColors.mountainGreen} />
                )}
              </TouchableOpacity>

              {/* Search results */}
              <ScrollView style={{ maxHeight: 400 }}>
                {isLoading && !isLoadingCurrentLocation ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={themeColors.mountainGreen} />
                  </View>
                ) : locationSuggestions.length > 0 ? (
                  locationSuggestions.map((suggestion: PlaceSuggestion, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 16,
                        borderBottomWidth: index !== locationSuggestions.length - 1 ? 1 : 0,
                        borderBottomColor: themeColors.border,
                      }}
                      onPress={() => handleLocationSelect(suggestion.placePrediction.text.text, suggestion.placePrediction.placeId)}
                    >
                      <Feather name="map-pin" size={16} color={themeColors.text} style={{ marginRight: 12 }} />
                      <ThemedText>{suggestion.placePrediction.text.text}</ThemedText>
                    </TouchableOpacity>
                  ))
                ) : searchQuery !== '' ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <ThemedText style={{ color: themeColors.textSecondary }}>No cities found</ThemedText>
                  </View>
                ) : null}
              </ScrollView>
            </ThemedView>
          </Animated.View>
        </TouchableOpacity>
        </TouchableOpacity>
      )}
    </Modal>
  );
};

export default CityLocationModal; 