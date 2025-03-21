import React, { useEffect, useState } from 'react';
import { View, Text, Image, Button, SafeAreaView, TouchableOpacity, TextInput, Dimensions, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Feather, Octicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useAuthSession } from "@/components/Auth/AuthProvider";

interface LocationSuggestion {
  placePrediction: {
    text: {
      text: string;
    };
    placeId: string;
  };
}

interface User {
  first_name: string;
  last_name: string;
  profile_picture: string;
  coverPhoto?: string;
  location?: {
    city: string;
    state: string;
    text: string;
    coordinates: {
      latitude: string;
      longitude: string;
    }
  };
  bio?: string;
  social_handles: {
    instagram: {
      username: string,
    },
    facebook: {
      username: string,
    }
  }
}

const EditUserGeneralInfo = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const { signOut } = useAuthSession();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [locationCity, setLocationCity] = useState(user?.location?.city || '');
  const [locationState, setLocationState] = useState(user?.location?.state || '');
  const [placeId, setPlaceId] = useState(user?.location?.city || '');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationLatitude, setLocationLatitude] = useState(user?.location?.coordinates.latitude || null);
  const [locationLongitude, setLocationLongitude] = useState(user?.location?.coordinates.longitude || null);
  const [locationInput, setLocationInput] = useState(user?.location?.text || '');
  const [instagramUsername, setInstagramUsername] = useState(user?.social_handles?.instagram?.username || '');
  const [facebookUsername, setFacebookUsername] = useState(user?.social_handles?.facebook?.username || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) throw new Error('No access token available');

      const response = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setUser(response.data);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        await refreshToken();
      } else {
        Alert.alert('Error', 'Failed to fetch user data');
        logout();
      }
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/token/refresh-token`, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      const { accessToken } = response.data;
      await AsyncStorage.setItem('accessToken', accessToken);

      await fetchUserData();
    } catch (error) {
      Alert.alert('Error', 'Token refresh failed');
    }
  };

  const logout = () => {
    signOut();
  }

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
    }, [])
  );

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
      const response = await axios.post(`https://places.googleapis.com/v1/places:autocomplete`, inputData,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API,
            "X-Goog-FieldMask": "*",
          },
        }
      );

      const data = response.data;
      
      setLocationSuggestions(data.suggestions || []);

    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      return [];
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
      
      // Extract locality (city) and administrative_area_level_1 (state)
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
    setLocationLatitude(latitude);
    setLocationLongitude(longitude);

    return
  };

  const editMyProfile = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) throw new Error('No access token available');
 
      const updatedProfile = {
        first_name: firstName,
        last_name: lastName,
        bio: bio,
        location: {
          city: locationCity,
          state: locationState,
          text: locationInput,
          coordinates: {
            lng: locationLongitude,
            lat: locationLatitude,
          }
        },
        social_handles: {
          instagram: {
            username: instagramUsername,
          },
          facebook: {
            username: facebookUsername,
          }
        }
      };
 
      const response = await axios.patch(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/user/edit/myprofile`,
        updatedProfile,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
 
      console.log('Profile updated successfully:', response.data);
    } catch (error: any) {
      console.error('Profile update failed:', error.response?.data?.message || error.message);
 
      if (error.response?.status === 401) {
        console.log('Access token expired, refreshing token...');
        await refreshAccessToken();
        await editMyProfile(); // Retry request after refreshing token
      }
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
      }
      setIsLoading(false);
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 2000);
    }
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.error('No refresh token available, user needs to log in again.');
        return;
      }

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/token/refresh-token`,
        {},
        {
          headers: { Authorization: `Bearer ${refreshToken}` },
        }
      );

      const newAccessToken = response.data.accessToken;

      if (newAccessToken) {
        await AsyncStorage.setItem('accessToken', newAccessToken);
        console.log('Access token refreshed');
      } else {
        console.error('Failed to obtain a new access token.');
      }
    } catch (error: any) {
      console.error('Failed to refresh access token:', error.response?.data?.message || error.message);
    }
  };

  if (!user) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaView style={{ alignItems: 'center' }}>

      {/* Saved Message */}
      {showSavedMessage && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: screenHeight,
          width: screenWidth,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10
        }}>
          <View style={{
            backgroundColor: 'rgba(50, 50, 50, 0.8)',
            padding: 25,
            borderRadius: 10,
          }}>
            <Text style={{ color: themeColors.text, fontWeight: 'bold', textAlign: 'center', fontSize: 16 }}>Saved!</Text>
          </View>
        </View>
      )}

      {/* Back Button */}
      <TouchableOpacity 
        style={{ 
          position: 'absolute', 
          top: 16, 
          left: 16, 
          backgroundColor: themeColors.background, 
          padding: 8, 
          borderRadius: 8, 
          marginTop: insets.top,
          zIndex: 10
        }}
        onPress={() => router.back()}
      >
        <IconSymbol name="chevron.left" size={24} color={themeColors.text} />
      </TouchableOpacity>

      {/* Cover Photo */}
      <View style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        width: '100%', 
        height: 300, 
        zIndex: -1,
      }}>
        {user.coverPhoto ? (
          <>
            <Image
              source={{ uri: user.coverPhoto }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'red', themeColors.background]}
              style={{ position: 'absolute', width: '100%', height: '100%', bottom: 0 }}
            />
          </>
        ) : (
          <>
            <View style={{ width: '100%', height: '100%', backgroundColor: themeColors.mountainGreen }} />
            <LinearGradient
              colors={['transparent', themeColors.background]}
              style={{ position: 'absolute', width: '100%', height: '100%', bottom: 0 }}
            />
          </>
        )}
        <TouchableOpacity 
          style={{ 
            position: 'absolute', 
            right: 16, 
            top: 16, 
            backgroundColor: themeColors.background, 
            padding: 12, 
            borderRadius: 8, 
            marginTop: insets.top 
          }}
        >
          <Feather name='camera' color={themeColors.text} size={32}/>
        </TouchableOpacity>
      </View>
      
      {/* Profile Picture */}
      <View style={{ alignItems: 'center', marginTop: 150 }}>
        <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: themeColors.mountainGreen, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {user.profile_picture ? (
            <Image
              source={{ uri: user.profile_picture }}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <Feather name="user" size={80} color={themeColors.mountainGreen} />
          )}
        </View>
        <TouchableOpacity 
          style={{ 
            position: 'absolute',
            bottom: 5, 
            right: -3, 
            backgroundColor: themeColors.background,
            borderWidth: 1,
            borderColor: themeColors.text,
            padding: 10, 
            borderRadius: 50
          }}
        >
          <Feather name="camera" size={20} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      {/* User Info Inputs */}
      <View style={{ width: '100%', marginTop: 32, paddingHorizontal: 16 }}>
        {/* First Name */}
        <View 
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <View
            style={{
              flex: 1
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>First Name</Text>
          </View>
          <View 
            style={{
              flex: 1
            }}
          >
            <TextInput 
              value={firstName} 
              onChangeText={setFirstName}
              placeholder='First Name'
              placeholderTextColor={themeColors.placeholderTextColor}
              style={{
                fontSize: 16, 
                color: themeColors.text 
              }}
            />
          </View>
        </View>
        
        {/* Last Name */}
        <View 
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16
          }}
        >
          <View
            style={{
              flex: 1
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>Last Name</Text>
          </View>
          <View 
            style={{
              flex: 1
            }}
          >
            <TextInput 
              value={lastName} 
              onChangeText={setLastName}
              placeholder='Last Name'
              placeholderTextColor={themeColors.placeholderTextColor}
              style={{
                fontSize: 16, 
                color: themeColors.text 
              }}
            />
          </View>
        </View>

        {/* Location */}
        <View 
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16
          }}
        >
          <View
            style={{
              flex: 1
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>Location</Text>
          </View>
          <View 
            style={{
              flex: 1
            }}
          >
            <TextInput 
              value={locationInput} 
              placeholder='Location'
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
            {/* Suggestions Dropdown */}
            {locationSuggestions.length > 0 && (
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

        {/* Bio */}
        <View 
          style={{
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              width: '100%',
              justifyContent: 'flex-start'
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text, alignSelf: 'flex-start' }}>Bio</Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 8,
              height: screenWidth / 5, // One-third of screen height
              alignItems: 'flex-start'
            }}
          >
            <TextInput 
              value={bio} 
              onChangeText={setBio}
              placeholder='Share a little about yourself and your interests'
              placeholderTextColor={themeColors.placeholderTextColor}
              multiline={true}
              maxLength={150}
              numberOfLines={4}
              style={{
                flex: 1,
                fontSize: 16, 
                color: themeColors.text 
              }}
            />
          </View>
        </View>
        
        {/* Social Media Handles */}
        {/* Instagram */}
        <View 
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Feather name='instagram' color={themeColors.text} size={24} style={{ marginRight: 8}} />
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>Instagram</Text>
          </View>
          <View 
            style={{
              flex: 1
            }}
          >
            <TextInput 
              value={instagramUsername} 
              onChangeText={setInstagramUsername}
              placeholder='Username'
              placeholderTextColor={themeColors.placeholderTextColor}
              autoCapitalize='none'
              style={{
                fontSize: 16, 
                color: themeColors.text 
              }}
            />
          </View>
        </View>
        {/* Facebook */}
        <View 
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Feather name='facebook' color={themeColors.text} size={24} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>Facebook</Text>
          </View>
          <View 
            style={{
              flex: 1
            }}
          >
            <TextInput 
              value={facebookUsername} 
              onChangeText={setFacebookUsername}
              autoCapitalize='none'
              placeholder='Username'
              placeholderTextColor={themeColors.placeholderTextColor}
              style={{
                fontSize: 16, 
                color: themeColors.text 
              }}
            />
          </View>
        </View>
      </View>
      <TouchableOpacity 
        onPress={editMyProfile}
        style={{ 
          flex: 1,
          width: '90%', 
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 8,
          backgroundColor: isLoading ? themeColors.inputBackgroundColor : themeColors.mountainGreen,
          marginTop: 48,
          padding: 10, 
          justifyContent: 'center'
        }} 
          disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size={24} color={themeColors.text} />
        ) : (
          <>
            <Feather name='save' size={24} style={{ color: themeColors.text, marginRight: 8 }} />
            <ThemedText style={{ fontSize: 16, color: themeColors.text, fontWeight: 'bold' }}>Save</ThemedText>
          </>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default EditUserGeneralInfo;
