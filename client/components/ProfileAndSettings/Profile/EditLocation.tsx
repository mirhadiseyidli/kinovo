import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Keyboard, Dimensions, TouchableWithoutFeedback, Modal, Pressable } from 'react-native';
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [inputPosition, setInputPosition] = useState({ top: 0, height: 0, width: 0, left: 0 });
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (locationSuggestions.length > 0) {
      measureInputPosition();
      setModalVisible(true);
    } else {
      setModalVisible(false);
    }
  }, [locationSuggestions]);

  const measureInputPosition = () => {
    if (inputRef.current) {
      inputRef.current.measureInWindow((x, y, width, height) => {
        setInputPosition({ 
          top: y + height, 
          height, 
          width, 
          left: x 
        });
      });
    }
  };

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

  const closeDropdown = () => {
    setLocationSuggestions([]);
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
            measureInputPosition();
            if (locationInput.trim()) {
              fetchLocationSuggestions(locationInput);
            }
          }}
        />
        
        <Modal
          transparent={true}
          visible={modalVisible}
          animationType="none"
          onRequestClose={closeDropdown}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'transparent',
            }}
            onPress={closeDropdown}
          >
            <ThemedView 
              style={{
                position: 'absolute',
                top: inputPosition.top,
                left: inputPosition.left,
                width: inputPosition.width,
                backgroundColor: themeColors.inputBackgroundColor,
                borderWidth: 1,
                borderColor: themeColors.border,
                borderRadius: 8,
                maxHeight: keyboardVisible ? 200 : 300,
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 8,
                zIndex: 1000,
              }}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <ScrollView 
                  style={{ maxHeight: keyboardVisible ? 200 : 300 }} 
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
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
              </Pressable>
            </ThemedView>
          </Pressable>
        </Modal>
      </View>
    </View>
  );
};