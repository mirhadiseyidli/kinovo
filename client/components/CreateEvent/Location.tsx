import React, { useState, useEffect } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Text,
  Animated,
  ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import axios from 'axios';
import { useLocation } from '@/context/LocationContext';
import MapViewModal from '../MapViewModal';
import { Suggestion, Coordinates, GeocodingApiResult, LocationSelectHandler, SelectedLocation, FetchAddressSuggestions } from '@/types/allTypes';
import { useCreateEventContext } from '@/context/CreateEventContext';
import api from '@/utils/api';

const LocationComponent: React.FC = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { location, settingEventLocation } = useCreateEventContext();
  
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(location?.text || null);
  const [mapVisible] = useState(new Animated.Value(location?.coordinates ? 1 : 0)); // Controls slide animation
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [inputText, setInputText] = useState<string>(location?.text || '');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    location?.coordinates && location.coordinates.lat && location.coordinates.lng
      ? { latitude: location.coordinates.lat, longitude: location.coordinates.lng } 
      : null
  );

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
      return;
    }

    try {
      // Use our backend API instead of direct Google API call
      let response = await api.post('/api/google/places/search', { textQuery: text });
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
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
    }
  };

  const handleLocationSelect: LocationSelectHandler = async (text, city, state, location) => {
    setSelectedLocation(text);
    setInputText(text);
    setSuggestions([]);

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
  };

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
          />
        </View>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <ThemedView style={{
            position: 'absolute',
            top: '110%', // Positions right below the input field
            left: 0,
            width: '100%',
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            paddingVertical: 5,
            maxHeight: 250, // Ensuring enough space for scrolling
            borderWidth: 1,
            borderColor: themeColors.background,
            zIndex: 1000, // Ensures it overlays other components
          }}>
            <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true}>
              {suggestions.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    padding: 12,
                    borderBottomWidth: index !== suggestions.length - 1 ? 1 : 0,
                    borderBottomColor: themeColors.background,
                  }}
                  onPress={() => handleLocationSelect(
                    item?.displayName?.text,
                    item?.postalAddress.locality,
                    item?.postalAddress.administrativeArea,
                    item?.location,
                  )}
                >
                  <Text style={{ fontWeight: 'bold', color: themeColors.text }}>{item['displayName']['text']}</Text>
                  <Text style={{ color: themeColors.text, fontSize: 12 }}>{item['formattedAddress']}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>
        )}

        {/* Animated Map View */}
        {coordinates && (
          <Animated.View style={{
            marginTop: mapVisible.interpolate({
              inputRange: [0, 1],
              outputRange: [-150, 24], // Slides down from hidden to visible
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