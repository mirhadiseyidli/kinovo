import React, { useEffect } from 'react';
import { View, DimensionValue, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// Reusable shimmer effect hook
const useShimmerAnimation = () => {
  const translateX = useSharedValue(-1);
  
  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      false
    );
    
    return () => {
      cancelAnimation(translateX);
    };
  }, []);
  
  return useAnimatedStyle(() => ({
    transform: [
      { 
        translateX: interpolate(
          translateX.value,
          [-1, 1],
          [-100, 300],
          Extrapolate.CLAMP
        ) 
      }
    ],
  }));
};

// Reusable skeleton box component
interface SkeletonBoxProps {
  width: DimensionValue;
  height: DimensionValue;
  borderRadius?: number;
  marginBottom?: number;
  marginRight?: number;
  marginLeft?: number;
  marginTop?: number;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({ 
  width, 
  height, 
  borderRadius = 4,
  marginBottom = 0,
  marginRight = 0,
  marginLeft = 0,
  marginTop = 0
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const animatedStyle = useShimmerAnimation();
  
  return (
    <View 
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: themeColors.skeletonBoxColor,
        marginBottom,
        marginRight,
        marginLeft,
        marginTop,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: '100%',
            height: '100%',
          },
          animatedStyle
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            themeColors.mountainGreen + '30',
            'transparent'
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );
};

/**
 * Skeleton component for the home page header
 * Displays loading placeholders for the Kinovo title and notification button
 */
export const HomeHeaderSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  return (
    <ThemedView 
      style={{
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 4,
      }}
    >
      {/* App Title Skeleton */}
      <SkeletonBox width={120} height={32} borderRadius={6} />
      
      {/* Notifications Button Skeleton */}
      <SkeletonBox width={30} height={30} borderRadius={15} />
    </ThemedView>
  );
};

/**
 * Skeleton component for event cards
 */
export const EventCardSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  return (
    <ThemedView 
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: themeColors.border,
        overflow: 'hidden',
        marginBottom: 16,
        padding: 16,
      }}
    >
      {/* Event Image Placeholder */}
      <SkeletonBox 
        width="100%" 
        height={160} 
        borderRadius={12}
        marginBottom={12}
      />
      
      {/* Event Title */}
      <SkeletonBox 
        width="70%" 
        height={20} 
        marginBottom={8}
      />
      
      {/* Event Details */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <SkeletonBox width={16} height={16} borderRadius={8} />
        <SkeletonBox width="50%" height={16} />
      </View>
      
      {/* Event Location */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <SkeletonBox width={16} height={16} borderRadius={8} />
        <SkeletonBox width="40%" height={16} />
      </View>
      
      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <SkeletonBox width="30%" height={32} borderRadius={6} />
        <SkeletonBox width="30%" height={32} borderRadius={6} />
        <SkeletonBox width="30%" height={32} borderRadius={6} />
      </View>
    </ThemedView>
  );
};

/**
 * Skeleton component for displaying multiple event cards in a loading state
 */
export const EventCardListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <ThemedView>
      {Array.from({ length: count }).map((_, index) => (
        <EventCardSkeleton key={index} />
      ))}
    </ThemedView>
  );
};

/**
 * Skeleton for the AttentionRequired component
 */
export const AttentionRequiredSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  return (
    <ThemedView style={{ width: '100%', paddingHorizontal: 16 }}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
      }}>
        <SkeletonBox width={120} height={16} />
        <SkeletonBox width={100} height={16} />
      </View>
      
      {/* Event Cards */}
      {Array.from({ length: 3 }).map((_, index) => (
        <ThemedView 
          key={index}
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 16
          }}
        >
          <View style={{ flexDirection: 'row' }}>
            {/* Left Section */}
            <View style={{ flex: 3, paddingRight: 8 }}>
              <SkeletonBox width={120} height={16} marginBottom={12} />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <SkeletonBox width={12} height={12} borderRadius={6} />
                <SkeletonBox width={80} height={12} />
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <SkeletonBox width={12} height={12} borderRadius={6} />
                <SkeletonBox width={80} height={12} />
              </View>
              
              <SkeletonBox width={120} height={16} borderRadius={4} />
            </View>
            
            {/* Right Section */}
            <View style={{ flex: 2, alignItems: 'flex-end' }}>
              <SkeletonBox width={100} height={14} marginBottom={12} />
              <SkeletonBox width={56} height={56} borderRadius={8} />
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={{ paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <SkeletonBox width="32%" height={24} borderRadius={6} />
              <SkeletonBox width="32%" height={24} borderRadius={6} />
              <SkeletonBox width="32%" height={24} borderRadius={6} />
            </View>
          </View>
        </ThemedView>
      ))}
    </ThemedView>
  );
};

/**
 * Skeleton for the AISummary component
 */
export const AISummarySkeleton: React.FC = () => {
  return (
    <ThemedView style={{ padding: 16, marginBottom: 16 }}>
      <SkeletonBox width="50%" height={24} marginBottom={16} />
      
      <View style={{ 
        borderRadius: 12, 
        padding: 16, 
        backgroundColor: 'rgba(0, 0, 0, 0.05)', 
        marginBottom: 16 
      }}>
        <SkeletonBox width="100%" height={16} marginBottom={8} />
        <SkeletonBox width="90%" height={16} marginBottom={8} />
        <SkeletonBox width="95%" height={16} marginBottom={8} />
        <SkeletonBox width="85%" height={16} marginBottom={8} />
        <SkeletonBox width="70%" height={16} />
      </View>
      
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <SkeletonBox width={100} height={36} borderRadius={18} />
      </View>
    </ThemedView>
  );
};

/**
 * Skeleton for the UpcomingEvents component
 */
export const UpcomingEventsSkeleton: React.FC = () => {
  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
      }}>
        <SkeletonBox width={150} height={16} />
        <SkeletonBox width={100} height={16} />
      </View>
      
      <View style={{ gap: 16, width: '100%' }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <ThemedView 
            key={index}
            style={{
              flexDirection: 'row',
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <SkeletonBox width={100} height={100} borderRadius={12} />
            
            <View style={{ flex: 1, paddingHorizontal: 12, justifyContent: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <SkeletonBox width={24} height={24} borderRadius={16} />
                  <SkeletonBox width={100} height={14} />
                </View>

                <View>
                  <SkeletonBox width={50} height={12} />
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SkeletonBox width={100} height={12} />
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SkeletonBox width={14} height={14} borderRadius={7} />
                <SkeletonBox width={100} height={12} />
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <SkeletonBox width={14} height={14} borderRadius={7} />
                  <SkeletonBox width={100} height={12} />
                </View>

                <View>
                  <SkeletonBox width={50} height={12} />
                </View>
              </View>
            </View>
          </ThemedView>
        ))}
      </View>
    </ThemedView>
  );
};

/**
 * Skeleton for a past events
 */
export const PastEventsSkeleton: React.FC = () => {
  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
      }}>
        <SkeletonBox width={150} height={16} />
        <SkeletonBox width={100} height={16} />
      </View>
      
      <View style={{ gap: 16, width: '100%' }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <ThemedView 
            key={index}
            style={{
              flexDirection: 'row',
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <SkeletonBox width={130} height={14} />
                </View>

                <View>
                  <SkeletonBox width={50} height={12} />
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SkeletonBox width={14} height={14} borderRadius={7} />
                <SkeletonBox width={100} height={12} />
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <SkeletonBox width={14} height={14} borderRadius={7} />
                  <SkeletonBox width={100} height={12} />
                </View>
              </View>
              <View style={{ bottom: 0, position: 'absolute', right: 0 }}>
                <SkeletonBox width={24} height={24} borderRadius={24} />
              </View>
            </View>
          </ThemedView>
        ))}
      </View>
    </ThemedView>
  );
};

/**
 * Skeleton for a search bar
 */
export const SearchBarSkeleton: React.FC = () => {
  return (
    <ThemedView style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: 'rgba(0,0,0,0.05)', 
      borderRadius: 20,
      padding: 8,
      marginHorizontal: 16,
      marginVertical: 8,
    }}>
      <SkeletonBox width={20} height={20} borderRadius={10} marginRight={8} />
      <SkeletonBox width="85%" height={20} borderRadius={10} />
    </ThemedView>
  );
};

/**
 * Skeleton for user/friend list items
 */
export const UserListItemSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <ThemedView>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ 
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(0,0,0,0.05)'
        }}>
          <SkeletonBox width={48} height={48} borderRadius={24} marginRight={12} />
          <View style={{ flex: 1 }}>
            <SkeletonBox width="60%" height={16} marginBottom={4} />
            <SkeletonBox width="40%" height={14} />
          </View>
          <SkeletonBox width={80} height={32} borderRadius={16} />
        </View>
      ))}
    </ThemedView>
  );
};

/**
 * Skeleton for Calendar day cells
 */
export const CalendarDayCellsSkeleton: React.FC = () => {
  return (
    <ThemedView style={{ paddingHorizontal: 8 }}>
      {/* Week days header */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {Array.from({ length: 7 }).map((_, index) => (
          <View key={index} style={{ flex: 1, alignItems: 'center', padding: 8 }}>
            <SkeletonBox width={12} height={16} borderRadius={2} />
          </View>
        ))}
      </View>
      
      {/* Calendar grid */}
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row', marginBottom: 8 }}>
          {Array.from({ length: 7 }).map((_, colIndex) => (
            <View key={colIndex} style={{ 
              flex: 1, 
              aspectRatio: 1, 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: 4
            }}>
              <SkeletonBox 
                width="80%" 
                height="80%" 
                borderRadius={rowIndex === 0 && colIndex === 3 ? 20 : 4} 
              />
            </View>
          ))}
        </View>
      ))}
    </ThemedView>
  );
};

/**
 * Skeleton for EventDetails component
 */
export const EventDetailsSkeleton: React.FC = () => {
  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Event Image */}
      <SkeletonBox width="100%" height={250} borderRadius={0} />
      
      {/* Event Content */}
      <View style={{ padding: 16 }}>
        {/* Title and Category */}
        <SkeletonBox width="80%" height={24} marginBottom={8} />
        <SkeletonBox width="40%" height={16} marginBottom={16} />
        
        {/* Action Buttons */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          marginBottom: 24 
        }}>
          <SkeletonBox width="30%" height={40} borderRadius={20} />
          <SkeletonBox width="30%" height={40} borderRadius={20} />
          <SkeletonBox width="30%" height={40} borderRadius={20} />
        </View>
        
        {/* Date and Time */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: 16, 
          gap: 12 
        }}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width="80%" height={18} />
        </View>
        
        {/* Location */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: 16, 
          gap: 12 
        }}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width="70%" height={18} />
        </View>
        
        {/* Description */}
        <SkeletonBox width="100%" height={16} marginBottom={8} />
        <SkeletonBox width="95%" height={16} marginBottom={8} />
        <SkeletonBox width="90%" height={16} marginBottom={8} />
        <SkeletonBox width="70%" height={16} marginBottom={24} />
        
        {/* Attendees Header */}
        <SkeletonBox width="50%" height={20} marginBottom={16} />
        
        {/* Attendees */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBox key={index} width={60} height={60} borderRadius={30} />
          ))}
        </View>
        
        {/* Host Info */}
        <SkeletonBox width="40%" height={20} marginBottom={12} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SkeletonBox width={48} height={48} borderRadius={24} />
          <SkeletonBox width="70%" height={18} />
        </View>
      </View>
    </ThemedView>
  );
};

/**
 * Skeleton for categories in Explore screen
 */
export const CategoriesSkeleton: React.FC = () => {
  return (
    <ThemedView style={{ marginBottom: 24 }}>
      <SkeletonBox width="40%" height={24} marginBottom={16} marginLeft={16} />
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={{ alignItems: 'center', width: 80 }}>
            <SkeletonBox width={64} height={64} borderRadius={32} marginBottom={8} />
            <SkeletonBox width={60} height={14} />
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
};

/**
 * Skeleton for the main Home screen
 */
export const HomeScreenSkeleton: React.FC = () => {
  return (
    <ScrollView style={{ flex: 1 }}>
      <HomeHeaderSkeleton />
      <AttentionRequiredSkeleton />
      <AISummarySkeleton />
      <UpcomingEventsSkeleton />
      <SkeletonBox width="60%" height={24} marginBottom={16} marginLeft={16} />
      <EventCardListSkeleton count={2} />
    </ScrollView>
  );
};

/**
 * Skeleton for the Explore screen
 */
export const ExploreScreenSkeleton: React.FC = () => {
  return (
    <ScrollView style={{ flex: 1 }}>
      <SearchBarSkeleton />
      <CategoriesSkeleton />
      <SkeletonBox width="50%" height={24} marginBottom={16} marginLeft={16} />
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={{ width: 120, alignItems: 'center' }}>
            <SkeletonBox width={100} height={100} borderRadius={12} marginBottom={8} />
            <SkeletonBox width={80} height={16} />
          </View>
        ))}
      </ScrollView>
      
      <SkeletonBox width="60%" height={24} marginBottom={16} marginTop={24} marginLeft={16} />
      <EventCardListSkeleton count={3} />
    </ScrollView>
  );
};

/**
 * Skeleton for the Calendar screen
 */
export const CalendarScreenSkeleton: React.FC = () => {
  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        padding: 16, 
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)'
      }}>
        <SkeletonBox width={120} height={24} />
        <SkeletonBox width={80} height={24} />
      </View>
      
      <CalendarDayCellsSkeleton />
      
      <View style={{ padding: 16 }}>
        <SkeletonBox width="40%" height={20} marginBottom={16} />
        
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={{ 
            flexDirection: 'row', 
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            backgroundColor: 'rgba(0,0,0,0.02)'
          }}>
            <View style={{ width: 50, alignItems: 'center', marginRight: 12 }}>
              <SkeletonBox width={40} height={40} borderRadius={4} marginBottom={4} />
              <SkeletonBox width={30} height={12} />
            </View>
            
            <View style={{ flex: 1 }}>
              <SkeletonBox width="70%" height={18} marginBottom={8} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SkeletonBox width={14} height={14} borderRadius={7} />
                <SkeletonBox width="60%" height={14} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ThemedView>
  );
};

// Export all skeleton components from this file
export default {
  HomeHeaderSkeleton,
  EventCardSkeleton,
  EventCardListSkeleton,
  AttentionRequiredSkeleton,
  AISummarySkeleton,
  UpcomingEventsSkeleton,
  SearchBarSkeleton,
  UserListItemSkeleton,
  CalendarDayCellsSkeleton,
  EventDetailsSkeleton,
  CategoriesSkeleton,
  HomeScreenSkeleton,
  ExploreScreenSkeleton,
  CalendarScreenSkeleton,
  SkeletonBox
}; 