import React from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import Category from '@/components/Explore/Category';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/ui/IconSymbol';

const categories = [
  { id: 1, iconName: 'activity', label: 'Sports', iconColor: '#4FB9AF' },
  { id: 2, iconName: 'music', label: 'Music', iconColor: '#6B63FF' },
  { id: 3, iconName: 'activity', label: 'Outdoor', iconColor: '#6BCB77' },
  { id: 4, iconName: 'image', label: 'Art', iconColor: '#FF6B6B' },
  { id: 5, iconName: 'activity', label: 'Sports', iconColor: '#4FB9AF' },
  { id: 6, iconName: 'music', label: 'Music', iconColor: '#6B63FF' },
  { id: 7, iconName: 'activity', label: 'Outdoor', iconColor: '#6BCB77' },
  { id: 8, iconName: 'image', label: 'Art', iconColor: '#FF6B6B' },
];

const Categories: React.FC = () => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();

  return (
    <ThemedView 
      className="flex-1"
      style={{ width: screenWidth }}
    >
      {/* Section Header */}
      <ThemedView className="flex-row justify-between items-center mb-4 px-4">
        <ThemedText className="text-md font-bold">Categories</ThemedText>
        <TouchableOpacity className="flex-row items-center">
          <ThemedText className="text-md mr-1">View All</ThemedText>
          <IconSymbol
            name="chevron.right"
            size={12}
            color={Colors[colorScheme ?? 'dark'].tint}
          />
        </TouchableOpacity>
      </ThemedView>

      {/* Scrollable Categories */}
      <ThemedView style={{ width: screenWidth }} className='px-4'>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className='flex'>
          <ThemedView className="flex-row gap-4">
            {categories.map((category) => (
              <ThemedView
                key={category.id}
                className="items-center justify-center"
                style={{
                  borderRadius: 16,
                  borderColor: Colors[colorScheme ?? 'dark'].border,
                }}
              >
                <Category
                  iconName={category.iconName}
                  label={category.label}
                  iconColor={category.iconColor}
                />
              </ThemedView>
            ))}
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </ThemedView>
  );
};

export default Categories;