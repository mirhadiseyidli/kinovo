import React from 'react';
import { View, TouchableOpacity, Linking, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ImageBackground } from 'expo-image';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface TrafficData {
  duration: string;
  condition: string;
  emoji: string;
  recommendation: string;
}

interface TrafficCardProps {
  traffic: TrafficData;
  mapImage: { uri: string };
  coordinates?: {
    lat: number;
    lng: number;
  };
  locationName?: string;
}

export const TrafficCard: React.FC<TrafficCardProps> = ({ traffic, mapImage, coordinates, locationName }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const handleTrafficPress = async () => {
    if (!coordinates) {
      Alert.alert('Directions', 'Location coordinates not available');
      return;
    }

    const openAppleMaps = async () => {
      try {
        const appleMapsUrl = `http://maps.apple.com/?daddr=${coordinates.lat},${coordinates.lng}`;
        await Linking.openURL(appleMapsUrl);
      } catch (error) {
        console.error('Error opening Apple Maps:', error);
        Alert.alert('Error', 'Unable to open Apple Maps');
      }
    };

    const openGoogleMaps = async () => {
      try {
        const googleMapsUrl = `http://maps.google.com/?daddr=${coordinates.lat},${coordinates.lng}`;
        await Linking.openURL(googleMapsUrl);
      } catch (error) {
        console.error('Error opening Google Maps:', error);
        Alert.alert('Error', 'Unable to open Google Maps');
      }
    };

    Alert.alert(
      'Get Directions',
      `Choose your preferred maps app to get directions to ${locationName || 'the event location'}:`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Apple Maps',
          onPress: openAppleMaps
        },
        {
          text: 'Google Maps',
          onPress: openGoogleMaps
        }
      ]
    );
  };

  return (
    <TouchableOpacity 
      onPress={handleTrafficPress}
      activeOpacity={0.8}
      style={{
        flex: 1,
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
      }}
    >
      <ImageBackground
        source={mapImage}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 16,
        }}
        contentFit="cover"
        cachePolicy="disk"
        allowDownscaling={true}
        imageStyle={{
          borderRadius: 16,
        }}
      />
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 16,
      }} />
      
      <View style={{ flex: 1, justifyContent: 'space-between', zIndex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <ThemedText style={{ fontSize: 26 }}>{traffic.emoji}</ThemedText>
          <ThemedText style={{ 
            fontSize: 18, 
            fontWeight: '700', 
            color: '#ffffff',
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}>
            {traffic.duration}
          </ThemedText>
        </View>
        <View>
          <ThemedText style={{ 
            fontSize: 13, 
            fontWeight: '600',
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}>
            {traffic.condition}
          </ThemedText>
          <ThemedText style={{ 
            fontSize: 11, 
            color: themeColors.textSecondary,
            marginTop: 2,
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}>
            {traffic.recommendation}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
};