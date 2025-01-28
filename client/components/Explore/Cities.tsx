import React from 'react';
import { ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import City from './City';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const cities = [
  { id: 1, name: 'San Francisco', image: require('@/assets/san-francisco.avif') },
  { id: 2, name: 'New York', image: require('@/assets/new-york.webp') },
  { id: 3, name: 'Los Angeles', image: require('@/assets/los-angeles.webp') },
  { id: 4, name: 'Chicago', image: require('@/assets/chicago.jpg') },
];

const Cities: React.FC = () => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();

  return (
    <ThemedView 
      className="flex-1"
      style={{ width: screenWidth }}
    >
      {/* Section Header */}
      <ThemedView className="flex-row justify-between items-center mb-4 px-4">
        <ThemedText className="text-lg font-bold">Cities</ThemedText>
        <TouchableOpacity className="flex-row items-center">
          <ThemedText className="text-sm font-bold text-[#4FB9AF] mr-1">View All</ThemedText>
          <IconSymbol
            name="chevron.right"
            size={12}
            color={Colors[colorScheme ?? 'dark'].tint}
          />
        </TouchableOpacity>
      </ThemedView>

      {/* Scrollable Cities */}
      <ThemedView style={{ width: screenWidth }} className='px-4'>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className='flex'>
          <ThemedView className="flex-row gap-4">
            {cities.map((city) => (
              <ThemedView
                key={city.id}
                className="items-center justify-center"
                style={{
                  borderRadius: 16,
                  borderColor: Colors[colorScheme ?? 'dark'].border,
                }}
              >
              <City name={city.name} image={city.image} />
              </ThemedView>
            ))}
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </ThemedView>
  );
};

export default Cities;