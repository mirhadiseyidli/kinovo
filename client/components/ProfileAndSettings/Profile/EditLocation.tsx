import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { EditUserLocationProps, PlaceSuggestion, PlaceDetails } from '@/types/allTypes';
import api from '@/utils/api';

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
}: EditUserLocationProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Show suggestions when there are results and input is focused
  useEffect(() => {
    setShowSuggestions(isInputFocused && locationSuggestions.length > 0);
  }, [isInputFocused, locationSuggestions.length]);

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
      const response = await api.post('/api/google/places/autocomplete', inputData);
      const data = response.data;
      setLocationSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
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
    setLocationInput(location);
    setPlaceId(id);
    setLocationSuggestions([]);
    setShowSuggestions(false);
    setIsInputFocused(false);

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

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleBackdropPress = () => {
    setShowSuggestions(false);
    setIsInputFocused(false);
    inputRef.current?.blur();
  };

  return (
    <>
      {/* Backdrop overlay - covers entire screen but positioned behind search components */}
      {showSuggestions && (
        <Pressable
          style={{
            position: 'absolute',
            top: -1000, // Extend way up
            left: -1000, // Extend way left
            right: -1000, // Extend way right
            bottom: -1000, // Extend way down
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 999, // Behind search components
          }}
          onPress={handleBackdropPress}
        />
      )}

      <View 
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          position: 'relative',
          zIndex: 1000,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>{label}</Text>
        </View>
        <View style={{ flex: 1, position: 'relative' }}>
          <TextInput 
            ref={inputRef}
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
            onFocus={() => {
              handleInputFocus();
              if (locationInput.trim()) {
                fetchLocationSuggestions(locationInput);
              }
            }}
          />
          
          {/* Results dropdown */}
          {showSuggestions && (
            <View style={{
              backgroundColor: themeColors.inputBackgroundColor,
              borderWidth: 1,
              borderColor: themeColors.border,
              borderRadius: 8,
              maxHeight: 200,
              width: '100%',
              position: 'absolute',
              top: 24,
              left: 0,
              zIndex: 1002,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
                scrollEnabled={true}
              >
                <View style={{ 
                  paddingHorizontal: 16, 
                  paddingVertical: 12, 
                  borderBottomWidth: 1, 
                  borderBottomColor: themeColors.border 
                }}>
                  <Text style={{ 
                    fontWeight: 'bold', 
                    fontSize: 14, 
                    color: themeColors.text,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    Locations
                  </Text>
                </View>
                {locationSuggestions.map((suggestion: PlaceSuggestion, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: index !== locationSuggestions.length - 1 ? 1 : 0,
                      borderBottomColor: themeColors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => handleLocationSelect(suggestion.placePrediction.text.text, suggestion.placePrediction.placeId)}
                  >
                    <Feather 
                      name="map-pin" 
                      size={12} 
                      color={themeColors.text} 
                      style={{ marginRight: 4 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontWeight: '600', 
                        fontSize: 12, 
                        color: themeColors.text 
                      }}>
                        {suggestion.placePrediction.text.text}
                      </Text>
                    </View>
                    <Feather 
                      name="arrow-up-right" 
                      size={16} 
                      color={themeColors.placeholderTextColor} 
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </>
  );
};