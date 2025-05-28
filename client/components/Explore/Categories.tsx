import React, { useEffect } from 'react';
import { View, ScrollView, Dimensions } from 'react-native';
import Category from '@/components/Explore/Category';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';

interface CategoriesProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

const categories = [
  { id: 1, iconName: 'activity', label: 'Sports', iconColor: '#4FB9AF' },
  { id: 2, iconName: 'music', label: 'Music', iconColor: '#6B63FF' },
  { id: 3, iconName: 'activity', label: 'Outdoor', iconColor: '#6BCB77' },
  { id: 4, iconName: 'image', label: 'Art', iconColor: '#FF6B6B' },
];

const Categories: React.FC<CategoriesProps> = ({ refreshing, onFinishRefresh }) => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    if (refreshing) {
      // TODO: Add actual data fetching here
      onFinishRefresh();
    }
  }, [refreshing]);

  const handleCategoryPress = (category: string) => {
    router.push(`/(auth)/(category)/${category}`);
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
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Categories</ThemedText>
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
                  onPress={() => handleCategoryPress(category.label)}
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