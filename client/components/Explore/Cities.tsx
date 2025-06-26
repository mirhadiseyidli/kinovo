import React, { useEffect } from 'react';
import { View, ScrollView, Dimensions } from 'react-native';
import City from './City';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';
import { CitiesSkeleton } from '../Skeleton';
import { useFocusEffect } from '@react-navigation/native';
import { ALL_CITIES } from '@/constants/Cities';

interface CitiesProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

const CITY_SPACING = 16;

const Cities: React.FC<CitiesProps> = ({ refreshing, onFinishRefresh }) => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const router = useRouter();

  // Get all cities from constants
  const cities = ALL_CITIES;

  useEffect(() => {
    if (refreshing) {
      // TODO: Add actual data fetching here
      onFinishRefresh();
    }
  }, [refreshing]);

  // Auto-recovery when screen comes into focus (for server reconnection scenarios)
  useFocusEffect(
    React.useCallback(() => {
      if (refreshing) {
        // TODO: Add actual data fetching here
        onFinishRefresh();
      }
    }, [refreshing])
  );

  const handleCityPress = (cityName: string) => {
    router.push(`/(auth)/(city)/${cityName}`);
  };

  return (
    <ThemedView style={{ flex: 1, width: screenWidth }}>
      {/* Section Header */}
      <ThemedView
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Cities</ThemedText>
      </ThemedView>

      {/* Scrollable Cities */}
      <ThemedView style={{ width: screenWidth }}>
        {refreshing ? (
          <CitiesSkeleton />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ width: screenWidth }}
            contentContainerStyle={{ 
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {cities.map((city, index) => (
              <View
                key={city.id}
                style={{
                  marginRight: index === cities.length - 1 ? 0 : CITY_SPACING,
                }}
              >
                <City 
                  name={city.name} 
                  image={city.image} 
                  onPress={() => handleCityPress(city.name)}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </ThemedView>
    </ThemedView>
  );
};

export default Cities;