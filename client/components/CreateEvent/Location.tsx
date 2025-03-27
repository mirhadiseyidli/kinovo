import React, { useState } from 'react';
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

const LocationComponent: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(null);
  const [mapVisible] = useState(new Animated.Value(0)); // Controls slide animation
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [inputText, setInputText] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const { locationPermission } = useLocation();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const fetchAddressSuggestions: FetchAddressSuggestions = async (text) => {
    if (!text.trim()) { // Ensure empty input fully clears suggestions
      setSuggestions([]);
      return;
    }

    try {
      let response = await axios.post(
        `https://places.googleapis.com/v1/places:searchText`,
        { textQuery: text },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API,
            "X-Goog-FieldMask": "*",
          },
        }
      );

      let results = response.data.places || [];

      // If no results AND input is not empty, use Geocoding API
      if (results.length === 0 && text.trim().length > 0) {
        response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json`,
          {
            params: {
              address: text,
              key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API,
            },
          }
        );

        results = response.data.results.map((item: GeocodingApiResult) => ({
          displayName: { text: item.formatted_address },
          formattedAddress: item.formatted_address,
          location: item.geometry.location,
        }));
      }

      setSuggestions(results);
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
    }
  };

  const handleLocationSelect: LocationSelectHandler = async (location, description) => {
    setSelectedLocation(description);
    setInputText(description);
    setSuggestions([]);

    if (!isNaN(location.latitude) && !isNaN(location.longitude)) {
      setCoordinates({ latitude: location.latitude, longitude: location.longitude });
    } else {
      console.error("Invalid coordinates received:", location);
    }

    // Animate map to slide down
    Animated.timing(mapVisible, {
      toValue: 1, // Fully visible
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  return (
    <ThemedView style={{ marginBottom: 24 }}>
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
          <Feather name="map-pin" size={24} color={themeColors.placeholderTextColor} style={{ marginRight: 10 }} />
          <TextInput
            autoCorrect={false} // Prevents unnecessary text input errors
            keyboardType="default" // Explicitly define the keyboard type
            style={{
              fontSize: 16,
              color: themeColors.text,
            }}
            placeholder="Add location"
            value={inputText}
            onChangeText={(text) => {
              if (text.length < inputText.length) { // Detect letter removal
                setCoordinates(null); // Hide the map
                Animated.timing(mapVisible, {
                  toValue: 0, // Hide map animation
                  duration: 300,
                  useNativeDriver: false,
                }).start();
              }
              
              setInputText(text);
              fetchAddressSuggestions(text);
            }}
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
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
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
                  onPress={() => handleLocationSelect(item['location'], item['displayName']['text'])}
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
            opacity: mapVisible
          }}>
            <MapViewModal
              locationPermission={locationPermission}
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