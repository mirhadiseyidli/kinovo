import React, { useEffect } from 'react';
import { ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import City from './City';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';

interface CitiesProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

const cities = [
  { id: 1, name: 'San Francisco', image: require('@/assets/san-francisco.avif') },
  { id: 2, name: 'New York', image: require('@/assets/new-york.webp') },
  { id: 3, name: 'Los Angeles', image: require('@/assets/los-angeles.webp') },
  { id: 4, name: 'Chicago', image: require('@/assets/chicago.jpg') },
];

const Cities: React.FC<CitiesProps> = ({ refreshing, onFinishRefresh }) => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    if (refreshing) {
      // TODO: Add actual data fetching here
      onFinishRefresh();
    }
  }, [refreshing]);

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: screenWidth }}
          contentContainerStyle={{ paddingLeft: 16, paddingRight: screenWidth * 0.04 }}
        >
          <ThemedView style={{ flexDirection: 'row', gap: 16 }}>
            {cities.map((city) => (
              <ThemedView
                key={city.id}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  borderColor: Colors[colorScheme ?? 'dark'].border,
                }}
              >
                <City 
                  name={city.name} 
                  image={city.image} 
                  onPress={() => handleCityPress(city.name)}
                />
              </ThemedView>
            ))}
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </ThemedView>
  );
};

export default Cities;