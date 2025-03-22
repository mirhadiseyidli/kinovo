import React, { useState } from 'react';
import axios from 'axios';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export const EditUserLocation = ({
  label,
  locationInput,
  setLocationInput,
  placeholder,
  setLocationCity,
  setLocationState,
  setLocationLatitude,
  setLocationLongitude,
  setPlaceId,
}: {
  label: string;
  locationInput: string;
  setLocationInput: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
  themeColors: any;
  setLocationCity: (text: string) => void;
  setLocationState: (text: string) => void;
  setLocationLatitude: (lat: string | null) => void;
  setLocationLongitude: (lng: string | null) => void;
  setPlaceId: (id: string) => void;
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  // const [placeId, setPlaceId] = useState('');
  // const [locationCity, setLocationCity] = useState('');
  // const [locationState, setLocationState] = useState('');
  // const [locationLatitude, setLocationLatitude] = useState<string | null>(null);
  // const [locationLongitude, setLocationLongitude] = useState<string | null>(null);

  const fetchLocationSuggestions = async (text: string) => {
    if (!text.trim()) {
      setLocationSuggestions([]);
      return;
    }

    const inputData = {
      input: text,
      includedPrimaryTypes: ["locality"]
    };

    try {
      const response = await axios.post(`https://places.googleapis.com/v1/places:autocomplete`, inputData, {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API,
          "X-Goog-FieldMask": "*",
        },
      });

      const data = response.data;
      setLocationSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
    }
  };

  const getLongitudeAndLatitude = async (id: string) => {
    try {
      const response = await axios.get(`https://places.googleapis.com/v1/places/${id}?fields=location,addressComponents`, {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API,
          "X-Goog-FieldMask": "*",
        },
      });

      const data = response.data;

      const cityComponent = data.addressComponents.find((component: any) =>
        component.types.includes("locality")
      );

      const stateComponent = data.addressComponents.find((component: any) =>
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
    setLocationSuggestions([]);
    setLocationInput(location);
    setPlaceId(id);

    const locationData = await getLongitudeAndLatitude(id);
    if (!locationData) {
      console.error("Failed to fetch location data.");
      return;
    }

    const { city, state, latitude, longitude } = locationData;
    setLocationCity(city || '');
    setLocationState(state || '');
    setLocationLatitude(latitude || null);
    setLocationLongitude(longitude || null);
  };

  return (
    <View 
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>{label}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <TextInput 
          value={locationInput} 
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholderTextColor}
          style={{
            fontSize: 16, 
            color: themeColors.text 
          }}
          onChangeText={(text) => {
            setLocationInput(text);
            fetchLocationSuggestions(text);
          }}
        />
        {locationSuggestions.length > 0 && (
          <ThemedView style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            width: '100%',
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            paddingVertical: 5,
            maxHeight: 250,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
            zIndex: 1000,
          }}>
            <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true}>
              {Object.values(locationSuggestions).map((suggestion: any, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    padding: 12,
                    borderBottomWidth: index !== Object.values(locationSuggestions).length - 1 ? 1 : 0,
                    borderBottomColor: themeColors.background,
                  }}
                  onPress={() => handleLocationSelect(suggestion.placePrediction.text.text, suggestion.placePrediction.placeId)}
                >
                  <Text style={{ fontWeight: 'bold', color: themeColors.text }}>{suggestion.placePrediction.text.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>
        )}
      </View>
    </View>
  );
};