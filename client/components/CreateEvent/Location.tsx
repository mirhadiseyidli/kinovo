import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  TextInput,
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
  onInputPositionChange?: (position: { x: number; y: number; width: number; height: number } | null) => void;
}

const LocationComponent: React.FC<LocationComponentProps> = ({
  suggestions,
  setSuggestions,
  showSuggestions,
  setShowSuggestions,
  onLocationSelect,
  onLocationSelectRef,
  onInputPositionChange,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { location, settingEventLocation } = useCreateEventContext();
  const userLocation = useLocation();
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const mountedRef = useRef(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(location?.text || null);
  const [inputText, setInputText] = useState<string>(location?.text || '');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    location?.coordinates && location.coordinates.lat && location.coordinates.lng
      ? { latitude: location.coordinates.lat, longitude: location.coordinates.lng } 
      : null
  );
  const [mapSnapshotUrl, setMapSnapshotUrl] = useState<{light: string | null, dark: string | null} | null>(null);
  const inputRef = useRef<View>(null);

  const getUserLocation = async () => {
    // Require explicit permission from context
    if (!userLocation?.locationPermission) return;
    try {
      const userCoordinates = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low, // lighter weight
      });
      if (!mountedRef.current) return;
      setUserCoordinates({
        latitude: userCoordinates.coords.latitude,
        longitude: userCoordinates.coords.longitude
      });
    } catch (err) {
      // Silently ignore – we already handle lack of permission elsewhere
      console.warn('getCurrentPositionAsync error', err);
    }
  };

  const generateMapSnapshot = async (lat: number, lon: number) => {
    try {
      const response = await api.post('/api/mapkit/snapshot-urls', {
        lat,
        lon,
        width: 640,
        height: 265,
        zoom: 15,
        scale: 2
      });
      
      if (response.data?.light && response.data?.dark) {
        const snapshotUrls = {
          light: response.data.light,
          dark: response.data.dark
        };
        setMapSnapshotUrl(snapshotUrls);
      }
    } catch (error) {
      console.error('[CreateEvent] Failed to generate map snapshot URLs:', error);
      // Don't block the UI, just let it fallback to interactive map
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    getUserLocation();
    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      // Cancel any pending API requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Cleanup complete
    };
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
        
        // Map will animate automatically via MapViewModal
      }
    }
  }, [location]);

  const fetchAddressSuggestions: FetchAddressSuggestions = async (text) => {
    if (!text.trim()) { // Ensure empty input fully clears suggestions
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Use our backend API instead of direct Google API call
      let response = await api.post('/api/google/places/search', { 
        textQuery: text, 
        latitude: userCoordinates?.latitude, 
        longitude: userCoordinates?.longitude 
      }, {
        signal: abortControllerRef.current.signal
      });
      let results = response.data.places || [];

      // If no results AND input is not empty, use Geocoding API through our backend
      if (results.length === 0 && text.trim().length > 0) {
        response = await api.get('/api/google/geocode', {
          params: {
            address: text
          },
          signal: abortControllerRef.current.signal
        });

        results = response.data.results.map((item: GeocodingApiResult) => ({
          displayName: { text: item.formatted_address },
          formattedAddress: item.formatted_address,
          location: item.geometry.location,
          postalAddress: item.postalAddress
        }));
      }

      if (!mountedRef.current) return;
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error: any) {
      // Don't show error for aborted requests
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        return;
      }
      console.error("Error fetching address suggestions:", error);
    }
  };

  const handleLocationSelect: LocationSelectHandler = async (text, city, state, location) => {
    setSelectedLocation(text);
    setInputText(text);
    setSuggestions([]);
    setShowSuggestions(false);

    if (!isNaN(location.latitude) && !isNaN(location.longitude)) {
      // Generate map snapshot first, then set coordinates
      await generateMapSnapshot(location.latitude, location.longitude);
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

    // Map will animate automatically via MapViewModal

    // Call the parent's handler
    onLocationSelect(text, city, state, location);
  };

  // Expose the internal handler to parent via ref
  React.useEffect(() => {
    onLocationSelectRef.current = handleLocationSelect;
  }, [handleLocationSelect]);

  const handleInputChange = (text: string) => {
    if (text.length < inputText.length) { // Detect letter removal
      setCoordinates(null); // Hide the map - animation handled by MapViewModal
      
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
    // Debounce network calls to avoid flooding
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    debounceTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        fetchAddressSuggestions(text);
      }
    }, 300);
  };

  const handleInputFocus = () => {
    // Measure input position and pass to parent
    inputRef.current?.measureInWindow((x, y, width, height) => {
      onInputPositionChange?.({ x, y, width, height });
    });
    
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };



  return (
    <ThemedView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View 
          ref={inputRef}
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

        {/* Map Container - Animation handled inside MapViewModal */}
        <View style={{
          width: '100%',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <MapViewModal
            coordinates={coordinates}
            selectedLocation={selectedLocation}
            mapSnapshotUrl={mapSnapshotUrl}
          />
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

export default LocationComponent;