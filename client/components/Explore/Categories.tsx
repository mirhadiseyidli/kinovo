import React, { useEffect } from 'react';
import { View, ScrollView, Dimensions } from 'react-native';
import Category from '@/components/Explore/Category';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';
import { useCategories } from '@/hooks/useCategories';
import { Feather } from '@expo/vector-icons';
import { CategoriesSkeleton } from '../Skeleton';
import { useFocusEffect } from '@react-navigation/native';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface CategoriesProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

// Color palette for categories
const categoryColors = [
  '#4FB9AF', // Teal
  '#6B63FF', // Purple
  '#6BCB77', // Green
  '#FF6B6B', // Red
  '#FFB347', // Orange
  '#9B59B6', // Deep Purple
  '#3498DB', // Blue
  '#E74C3C', // Dark Red
  '#2ECC71', // Emerald
  '#F1C40F'  // Yellow
];

const CATEGORY_SPACING = 12;

const Categories: React.FC<CategoriesProps> = ({ refreshing, onFinishRefresh }) => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { categories, fetchCategories, loading, isFirstFetch, error } = useCategories();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (refreshing) {
      fetchCategories().finally(() => {
        onFinishRefresh();
      });
    }
  }, [refreshing]);

  // Auto-recovery when screen comes into focus (for server reconnection scenarios)
  useFocusEffect(
    React.useCallback(() => {
      if (refreshing) {
        fetchCategories().finally(() => {
          onFinishRefresh();
        });
      }
    }, [refreshing])
  );

  const handleCategoryPress = (category: string) => {
    router.push(`/(auth)/(category)/${encodeURIComponent(category)}`);
  };

  const getIconForCategory = (categoryName: string): FeatherIconName => {
    const iconMap: { [key: string]: FeatherIconName } = {
      'Alpine Ski': 'activity',
      'Backcountry Ski': 'activity',
      'Badminton': 'activity',
      'Canoeing': 'activity',
      'Crossfit': 'activity',
      'E-Bike Ride': 'activity',
      'Elliptical': 'activity',
      'E-Mountain Bike Ride': 'activity',
      'Golf': 'target',
      'Gravel Ride': 'activity',
      'Handcycle': 'activity',
      'High Intensity Interval Training': 'activity',
      'Hike': 'map',
      'Ice Skate': 'activity',
      'Inline Skate': 'activity',
      'Kayaking': 'activity',
      'Kitesurf': 'wind',
      'Mountain Bike Ride': 'activity',
      'Nordic Ski': 'activity',
      'Pickleball': 'activity',
      'Pilates': 'activity',
      'Racquetball': 'activity',
      'Ride': 'activity',
      'Rock Climbing': 'trending-up',
      'Roller Ski': 'activity',
      'Rowing': 'activity',
      'Run': 'activity',
      'Sail': 'anchor',
      'Skateboard': 'activity',
      'Snowboard': 'activity',
      'Snowshoe': 'activity',
      'Soccer': 'activity',
      'Squash': 'activity',
      'Stair Stepper': 'activity',
      'Stand Up Paddling': 'activity',
      'Surfing': 'activity',
      'Swim': 'droplet',
      'Table Tennis': 'activity',
      'Tennis': 'activity',
      'Trail Run': 'map',
      'Velomobile': 'activity',
      'Walk': 'activity',
      'Weight Training': 'activity',
      'Wheelchair': 'activity',
      'Windsurf': 'wind',
      'Workout': 'activity',
      'Yoga': 'activity'
    };

    return iconMap[categoryName] || 'activity';
  };

  // Show skeleton only on first fetch, not on refreshes
  const showSkeleton = isFirstFetch && loading;

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
      <ThemedView style={{ width: screenWidth }}>
        {showSkeleton ? (
          <CategoriesSkeleton />
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
            {categories.map((category, index) => (
              <View
                key={category._id}
                style={{
                  marginRight: index === categories.length - 1 ? 0 : CATEGORY_SPACING,
                }}
              >
                <Category
                  iconName={getIconForCategory(category.name)}
                  label={category.name}
                  iconColor={categoryColors[index % categoryColors.length]}
                  onPress={() => handleCategoryPress(category.name)}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </ThemedView>
    </ThemedView>
  );
};

export default Categories;