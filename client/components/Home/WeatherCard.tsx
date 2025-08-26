import React from 'react';
import { View, TouchableOpacity, Linking, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import LinearGradient from 'react-native-linear-gradient';
import { getWeatherEmoji } from '@/constants/WeatherConditions';

interface WeatherData {
  temperature: string;
  condition: string;
  emoji: string;
  recommendation: string;
}

interface WeatherCardProps {
  weather: WeatherData;
  backgroundColors: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, backgroundColors, coordinates }) => {
  const handleWeatherPress = async () => {
    if (!coordinates) {
      Alert.alert('Weather', 'Location coordinates not available');
      return;
    }

    Alert.alert(
      'Open Weather App',
      'Would you like to view detailed weather information for this event location?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Open Weather',
          onPress: async () => {
            try {
              // iOS Weather app doesn't reliably respect location parameters
              // Use Apple Weather web interface which properly shows the location
              const appleWeatherUrl = `https://weather.apple.com/?lat=${coordinates.lat}&lon=${coordinates.lng}`;
              await Linking.openURL(appleWeatherUrl);
            } catch (error) {
              console.error('Error opening weather:', error);
              // Fallback to Weather.com
              try {
                const weatherComUrl = `https://weather.com/weather/today/l/${coordinates.lat},${coordinates.lng}`;
                await Linking.openURL(weatherComUrl);
              } catch (fallbackError) {
                console.error('Error opening fallback weather:', fallbackError);
                Alert.alert('Error', 'Unable to open weather information');
              }
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity 
      onPress={handleWeatherPress}
      activeOpacity={0.8}
      style={{
        flex: 1,
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={backgroundColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 16,
        }}
      />
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <ThemedText style={{ fontSize: 26 }}>
            {weather.emoji || getWeatherEmoji(weather.condition) || '🌤️'}
          </ThemedText>
          <ThemedText style={{ 
            fontSize: 18, 
            fontWeight: '700', 
            color: '#ffffff',
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}>
            {weather.temperature}
          </ThemedText>
        </View>
        <View>
          <ThemedText style={{ 
            fontSize: 13, 
            color: '#ffffff',
            fontWeight: '600',
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}>
            {weather.condition}
          </ThemedText>
          <ThemedText style={{ 
            fontSize: 11, 
            color: 'rgba(255,255,255,0.9)',
            marginTop: 2,
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}>
            {weather.recommendation}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
};