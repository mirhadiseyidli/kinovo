import React, { useState, useEffect } from 'react';
import {
  View,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Text,
  Animated,
  Linking,
  Alert,
  ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';

const LocationComponent: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [mapVisible] = useState(new Animated.Value(0)); // Controls slide animation
  const [suggestions, setSuggestions] = useState([]);
  const [inputText, setInputText] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const {width, height} = Dimensions.get('window');
  const ASPECT_RATIO = width / height;
  const LATITUDE_DELTA = 0.0922;
  const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

  useEffect(() => {
    const requestLocationPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
    
      if (status !== 'granted') {
        Alert.alert(
          "Location Permission Denied",
          "Enable location access in settings to use this feature."
        );
        setLocationPermission(false);
        return;
      }
      setLocationPermission(true);
      return;
    };

    requestLocationPermission();
  }, []);

  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;

  const fetchAddressSuggestions = async (text: string) => {
    if (!text.trim()) { // Ensure empty input fully clears suggestions
      setSuggestions([]);
      return;
    }

    try {
      let response = await axios.post(
        `https://places.googleapis.com/v1/places:searchText?key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API}`,
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

        results = response.data.results.map((item: any) => ({
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

  const handleLocationSelect = async (location: { latitude: number; longitude: number }, description: string) => {
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
            paddingVertical: 8,
            height: screenWidth / 10,
          }}
        >
          <Feather name="map-pin" size={24} color={themeColors.placeholderTextColor} style={{ marginRight: 10 }} />
          <TextInput
            autoCorrect={false} // Prevents unnecessary text input errors
            keyboardType="default" // Explicitly define the keyboard type
            style={{
              flex: 1,
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
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            marginTop: 8,
            paddingVertical: 5,
            maxHeight: 250, // Ensuring enough space for scrolling
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3
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
            <MapView
              loadingEnabled={true}
              showsUserLocation={locationPermission}
              userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}
              style={{ 
                width: '100%', 
                height: '100%',
                borderRadius: 8
              }}
              region={{
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                latitudeDelta: LATITUDE_DELTA, // Zooms in closer
                longitudeDelta: LONGITUDE_DELTA, // Zooms in closer
              }}
            >
              <Marker coordinate={coordinates} title={selectedLocation || 'Selected Location'} pinColor={themeColors.mountainGreen}/>
            </MapView>

            {/* Directions Button */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                backgroundColor: themeColors.background,
                paddingVertical: 10,
                paddingHorizontal: 15,
                borderRadius: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => {
                Alert.alert(
                  "Open Apple Maps?",
                  `Do you want to get directions to "${selectedLocation}"?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Apple Maps",
                      onPress: () => {
                        const url = `http://maps.apple.com/?daddr=${coordinates.latitude},${coordinates.longitude}`;
                        Linking.openURL(url);
                      },
                    },
                    {
                      text: "Google Maps",
                      onPress: () => {
                        const url = `http://maps.google.com/?daddr=${coordinates.latitude},${coordinates.longitude}`;
                        Linking.openURL(url);
                      },
                    },
                  ]
                );
              }}
            >
              <FontAwesome name="location-arrow" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

export default LocationComponent;