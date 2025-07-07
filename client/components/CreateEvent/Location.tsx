import React, { useState, useEffect } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Suggestion, Coordinates, GeocodingApiResult, LocationSelectHandler, SelectedLocation, FetchAddressSuggestions } from '@/types/allTypes';
import { useCreateEventContext } from '@/context/CreateEventContext';
import api from '@/utils/api';
import MapViewModal from '../MapViewModal';
import { useLocation } from '@/context/LocationContext';
import * as Location from 'expo-location';

interface LocationComponentProps {
  suggestions: Suggestion[];
  setSuggestions: (suggestions: Suggestion[]) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onLocationSelect: (text: string, city: string, state: string, location: any) => void;
  onLocationSelectRef: React.MutableRefObject<((text: string, city: string, state: string, location: any) => void) | null>;
}

const LocationComponent: React.FC<LocationComponentProps> = ({
  suggestions,
  setSuggestions,
  showSuggestions,
  setShowSuggestions,
  onLocationSelect,
  onLocationSelectRef,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { location, settingEventLocation } = useCreateEventContext();
  const userLocation = useLocation();
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(location?.text || null);
  const [mapVisible] = useState(new Animated.Value(location?.coordinates ? 1 : 0)); // Controls slide animation
  const [inputText, setInputText] = useState<string>(location?.text || '');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    location?.coordinates && location.coordinates.lat && location.coordinates.lng
      ? { latitude: location.coordinates.lat, longitude: location.coordinates.lng } 
      : null
  );

  const getUserLocation = async () => {
    if (!userLocation) return;
    const userCoordinates = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 1000,
      distanceInterval: 10
    });
    setUserCoordinates({
      latitude: userCoordinates.coords.latitude,
      longitude: userCoordinates.coords.longitude
    });
  }

  useEffect(() => {
    getUserLocation();
  }, [userLocation]);

  // Update local state when context changes
  useEffect(() => {
    if (location) {
      setSelectedLocation(location.text);
      setInputText(location.text || '');
      
      if (location.coordinates && location.coordinates.lat && location.coordinates.lng) {
        setCoordinates({ 
          latitude: location.coordinates.lat, 
          longitude: location.coordinates.lng 
        });
        
        // Show map if coordinates exist
        Animated.timing(mapVisible, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [location]);

  const fetchAddressSuggestions: FetchAddressSuggestions = async (text) => {
    if (!text.trim()) { // Ensure empty input fully clears suggestions
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Use our backend API instead of direct Google API call
      let response = await api.post('/api/google/places/search', { textQuery: text, latitude: userCoordinates?.latitude, longitude: userCoordinates?.longitude });
      let results = response.data.places || [];

      // If no results AND input is not empty, use Geocoding API through our backend
      if (results.length === 0 && text.trim().length > 0) {
        response = await api.get('/api/google/geocode', {
          params: {
            address: text
          }
        });

        results = response.data.results.map((item: GeocodingApiResult) => ({
          displayName: { text: item.formatted_address },
          formattedAddress: item.formatted_address,
          location: item.geometry.location,
          postalAddress: item.postalAddress
        }));
      }

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
    }
  };

  const handleLocationSelect: LocationSelectHandler = async (text, city, state, location) => {
    setSelectedLocation(text);
    setInputText(text);
    setSuggestions([]);
    setShowSuggestions(false);

    if (!isNaN(location.latitude) && !isNaN(location.longitude)) {
      setCoordinates({ latitude: location.latitude, longitude: location.longitude });
    } else {
      console.error("Invalid coordinates received:", location);
    }

    settingEventLocation({ 
      text: text,
      city,
      state,
      coordinates: { 
        lat: location.latitude, 
        lng: location.longitude 
      }
    });

    // Animate map to slide down
    Animated.timing(mapVisible, {
      toValue: 1, // Fully visible
      duration: 500,
      useNativeDriver: false,
    }).start();

    // Call the parent's handler
    onLocationSelect(text, city, state, location);
  };

  // Expose the internal handler to parent via ref
  React.useEffect(() => {
    onLocationSelectRef.current = handleLocationSelect;
  }, [handleLocationSelect]);

  const handleInputChange = (text: string) => {
    if (text.length < inputText.length) { // Detect letter removal
      setCoordinates(null); // Hide the map
      Animated.timing(mapVisible, {
        toValue: 0, // Hide map animation
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      // Clear location in context if input is cleared
      if (!text.trim()) {
        // Create empty location object instead of null
        settingEventLocation({ 
          text: '',
          city: null,
          state: null,
          coordinates: { 
            lat: null, 
            lng: null 
          }
        });
      }
    }
    
    setInputText(text);
    fetchAddressSuggestions(text);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };



  return (
    <ThemedView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Feather name="map-pin" size={18} color={themeColors.placeholderTextColor} style={{ marginRight: 10 }} />
          <TextInput
            autoCorrect={false} // Prevents unnecessary text input errors
            keyboardType="default" // Explicitly define the keyboard type
            style={{
              fontSize: 16,
              color: themeColors.text,
              flex: 1,
            }}
            placeholder="Add location"
            value={inputText}
            onChangeText={handleInputChange}
            onFocus={handleInputFocus}
          />
        </View>

        {/* Animated Map View */}
        {coordinates && (
          <Animated.View style={{
            marginTop: mapVisible.interpolate({
              inputRange: [0, 1],
              outputRange: [-150, 16], // Slides down from hidden to visible
            }),
            height: mapVisible.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 150], // Expands height smoothly
            }),
            width: '100%',
            opacity: mapVisible,
            borderRadius: 8,
            overflow: 'hidden'
          }}
          pointerEvents="none" // Disable interactions with the map
          >
            <MapViewModal
              coordinates={coordinates}
              selectedLocation={selectedLocation}
            />
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

export default LocationComponent;