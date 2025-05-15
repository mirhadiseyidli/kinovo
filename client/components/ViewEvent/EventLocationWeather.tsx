import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useGetWeather } from '@/hooks/useGetWeather';

type WeatherDisplayProps = {
  lat: number | null;
  lon: number | null;
  size?: number;
};

export const WeatherDisplay: React.FC<WeatherDisplayProps> = React.memo(({ lat, lon, size = 24 }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const { fetchWeather, loading, temperature } = useGetWeather(lat, lon);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  if (loading) {
    return <ActivityIndicator size="small" />;
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Feather name="cloud" size={size} color={themeColors.text} />
      <Text style={{ fontSize: size * 0.6, color: themeColors.text }}>
        {temperature !== null ? `${temperature}°` : '--'}
      </Text>
    </View>
  );
});
