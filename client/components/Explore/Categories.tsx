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
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Categories</ThemedText>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 16, marginRight: 4 }}>View All</ThemedText>
          <IconSymbol name="chevron.right" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
        </TouchableOpacity>
      </ThemedView>

      {/* Scrollable Categories */}
      <ThemedView style={{ width: screenWidth, paddingHorizontal: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <ThemedView style={{ flexDirection: 'row', gap: 16 }}>
            {categories.map((category) => (
              <ThemedView
                key={category.id}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
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