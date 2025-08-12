import React from 'react';
import { View, DimensionValue, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Animated from 'react-native-reanimated';

// Reusable shimmer effect with CSS animations
const useShimmerAnimation = (shouldAnimate: boolean = true) => {
  return {
    opacity: shouldAnimate ? 1 : 0.3,
    ...(shouldAnimate && {
      animationName: {
        '0%': { opacity: 0.3 },
        '50%': { opacity: 0.7 },
        '100%': { opacity: 0.3 },
      },
      animationDuration: '1500ms',
      animationIterationCount: 'infinite' as const,
      animationTimingFunction: 'ease-in-out',
    }),
  };
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
    <Animated.View 
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: themeColors.skeletonBoxColor,
        marginBottom,
        marginRight,
        marginLeft,
        marginTop,
        ...animatedStyle,
      }}
    />
  );
};

/**
 * Skeleton for the UserGeneralInfo component
 */
export const UserGeneralInfoSkeleton = () => {
  return (
    <ThemedView>
      {/* Profile Photo and Basic Info Skeleton - matches actual layout */}
      <View style={{ 
        flex: 1, 
        alignItems: 'center', 
        flexDirection: 'row', 
        paddingVertical: 16, 
        width: '100%', 
        paddingHorizontal: 16 
      }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <SkeletonBox width={120} height={120} borderRadius={999} />
        </View>

        <View style={{ flex: 1.5, alignItems: 'flex-start' }}>
          {/* Name skeleton */}
          <SkeletonBox width={'80%'} height={20} marginBottom={8} />
          {/* Username skeleton */}
          <SkeletonBox width={'60%'} height={16} marginBottom={12} />
          {/* Stats skeleton - friends, events, activities */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SkeletonBox width={60} height={48} borderRadius={8}/>
            <SkeletonBox width={60} height={48} borderRadius={8}/>
            <SkeletonBox width={60} height={48} borderRadius={8}/>
          </View>
        </View>
      </View>

      {/* Bio and details section skeleton */}
      <View style={{ width: '100%', paddingHorizontal: 16, gap: 8 }}>
        {/* Bio skeleton */}
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <SkeletonBox width={16} height={16} borderRadius={8} />
          <SkeletonBox width={'70%'} height={14} />
        </View>
        
        {/* Location skeleton */}
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <SkeletonBox width={16} height={16} borderRadius={8} />
          <SkeletonBox width={'50%'} height={14} />
        </View>
        
        {/* Social handles skeleton */}
        <View style={{ flexDirection: 'row', gap: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SkeletonBox width={16} height={16} borderRadius={8} />
            <SkeletonBox width={80} height={14} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SkeletonBox width={16} height={16} borderRadius={8} />
            <SkeletonBox width={80} height={14} />
          </View>
        </View>
        
        {/* Member info skeleton */}
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <SkeletonBox width={16} height={16} borderRadius={8} />
          <SkeletonBox width={'90%'} height={14} />
        </View>
      </View>

      {/* Action Buttons Skeleton */}
      <View style={{ flexDirection: 'row', width: '100%', paddingHorizontal: 16, gap: 8, marginTop: 16 }}>
        <SkeletonBox width={'50%'} height={40} borderRadius={8} />
        <SkeletonBox width={'50%'} height={40} borderRadius={8} />
      </View>
    </ThemedView>
  );
};

/**
 * Skeleton for the AttentionRequired component
 */
export const EventCardSkeleton: React.FC<{ count?: number }> = React.memo(({ count = 2 }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  return (
    <ThemedView style={{ width: '100%' }}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ marginBottom: index === 0 ? 16 : 0 }}>
          <SkeletonBox width={'100%'} height={120} borderRadius={12} />
        </View>
      ))}
    </ThemedView>
  );
});

EventCardSkeleton.displayName = 'EventCardSkeleton';

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
 * Skeleton for map loading
 */
export const MapSkeleton: React.FC<{ height?: number }> = ({ height = 150 }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  return (
    <View 
      style={{
        width: '100%',
        height: height,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: themeColors.skeletonBoxColor,
        position: 'relative',
      }}
    >
      {/* Base map skeleton */}
      <SkeletonBox width="100%" height="100%" borderRadius={8} />
      
      {/* Overlay elements to simulate map features */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Simulated map pin */}
        <View style={{ 
          position: 'absolute', 
          top: '40%', 
          left: '50%', 
          transform: [{ translateX: -8 }, { translateY: -16 }],
          alignItems: 'center'
        }}>
          <SkeletonBox width={16} height={16} borderRadius={8} />
        </View>
        
        {/* Simulated map roads/paths */}
        <View style={{ position: 'absolute', top: '30%', left: '20%', right: '20%' }}>
          <SkeletonBox width="100%" height={2} borderRadius={1} />
        </View>
        <View style={{ position: 'absolute', top: '60%', left: '10%', right: '30%' }}>
          <SkeletonBox width="100%" height={2} borderRadius={1} />
        </View>
        <View style={{ position: 'absolute', top: '75%', left: '30%', right: '10%' }}>
          <SkeletonBox width="100%" height={2} borderRadius={1} />
        </View>
        
        {/* Simulated map blocks/buildings */}
        <View style={{ position: 'absolute', top: '20%', left: '15%' }}>
          <SkeletonBox width={24} height={20} borderRadius={2} />
        </View>
        <View style={{ position: 'absolute', top: '70%', left: '70%' }}>
          <SkeletonBox width={20} height={16} borderRadius={2} />
        </View>
        <View style={{ position: 'absolute', top: '25%', left: '75%' }}>
          <SkeletonBox width={16} height={24} borderRadius={2} />
        </View>
      </View>
    </View>
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
    }}>
      <SkeletonBox width={'100%'} height={40} borderRadius={8} />
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
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={{ alignItems: 'center'}}>
            <SkeletonBox width={112} height={112} borderRadius={16}/>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
};

/**
 * Skeleton for cities in Explore screen
 */
export const CitiesSkeleton: React.FC = () => {
  return (
    <ThemedView style={{ marginBottom: 24 }}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={{ alignItems: 'center'}}>
            <SkeletonBox width={180} height={180} borderRadius={16}/>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
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

/**
 * Skeleton for profile preview
 */
export const ProfilePreviewSkeleton: React.FC = () => {
  return (
    <ThemedView style={{ alignItems: 'center', justifyContent: 'center' }}>
        <SkeletonBox width={140} height={140} borderRadius={999}/>
        <SkeletonBox width={160} height={24} borderRadius={8} marginTop={20}/>
        <SkeletonBox width={180} height={16} borderRadius={4} marginTop={4}/>
    </ThemedView>
  );
};

/**
 * Skeleton for the View Event page - matches exact layout structure
 */
export const ViewEventSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          width: '100%',
          paddingBottom: 40 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Image Section - matches EventImage component */}
        <View style={{ width: '100%', paddingTop: 32 }}>
          <View style={{ alignItems: 'center', borderRadius: 16, overflow: 'hidden' }}>
            <SkeletonBox width={240} height={240} borderRadius={16} />
          </View>
        </View>
        
        {/* Event Details Section - matches EventDetailsSection */}
        <View style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'column', gap: 16 }}>
            
            {/* Title and Category - matches EventTitleAndCategory */}
            <View style={{ 
              flexDirection: 'row', 
              gap: 8, 
              alignItems: 'center',
              borderTopColor: themeColors.calendarBorderColor,
              borderTopWidth: 0.2,
              paddingTop: 16,
              marginTop: 16,
              justifyContent: 'space-between'
            }}>
              <SkeletonBox width={180} height={20} />
              <SkeletonBox width={120} height={24} borderRadius={4} />
            </View>

            {/* Time and Date - matches EventTimeAndDate */}
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <SkeletonBox width={16} height={16} borderRadius={8} marginTop={1} />
              <View style={{ flexDirection: 'column', gap: 4 }}>
                <SkeletonBox width={180} height={16} />
                <SkeletonBox width={160} height={16} />
              </View>
            </View>

            {/* Event Status Action Buttons - 3 buttons in a row */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              marginVertical: 8
            }}>
              <SkeletonBox width="30%" height={40} borderRadius={8} />
              <SkeletonBox width="30%" height={40} borderRadius={8} />
              <SkeletonBox width="30%" height={40} borderRadius={8} />
            </View>

            {/* Location Info - matches EventLocationInfo */}
            <View style={{ flexDirection: 'column', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, flexDirection: 'row', gap: 12 }} >
                  <SkeletonBox width={16} height={16} borderRadius={8} />
                  <View style={{ flexDirection: 'column', gap: 4 }}>
                    <SkeletonBox width={150} height={16} />
                    <SkeletonBox width={120} height={16} />
                  </View>
                </View>
              </View>
              {/* Map placeholder */}
              <MapSkeleton height={150} />
            </View>

            {/* Attendees Section - matches EventAttendees */}
            <View>
              <SkeletonBox width="40%" height={20} marginBottom={16} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonBox key={index} width={60} height={60} borderRadius={30} />
                ))}
              </View>
            </View>

            {/* Description - matches ExpandableDescription */}
            <View>
              <SkeletonBox width="30%" height={20} marginBottom={12} />
              <SkeletonBox width="100%" height={16} marginBottom={8} />
              <SkeletonBox width="95%" height={16} marginBottom={8} />
              <SkeletonBox width="90%" height={16} marginBottom={8} />
              <SkeletonBox width="70%" height={16} />
            </View>

            {/* Visibility Info - matches EventVisibilityInfo */}
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <SkeletonBox width={16} height={16} borderRadius={8} />
              <SkeletonBox width={120} height={16} />
            </View>

            {/* Creation Details - matches EventCreationDetails */}
            <View>
              <SkeletonBox width="50%" height={20} marginBottom={12} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SkeletonBox width={48} height={48} borderRadius={24} />
                <View>
                  <SkeletonBox width={100} height={16} marginBottom={4} />
                  <SkeletonBox width={80} height={14} />
                </View>
              </View>
            </View>

            {/* Report Button placeholder */}
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <SkeletonBox width={100} height={36} borderRadius={18} />
            </View>

          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
};

// Export all skeleton components from this file
export default {
  EventCardSkeleton,
  AISummarySkeleton,
  SearchBarSkeleton,
  UserListItemSkeleton,
  CalendarDayCellsSkeleton,
  EventDetailsSkeleton,
  CategoriesSkeleton,
  CalendarScreenSkeleton,
  ViewEventSkeleton,
  SkeletonBox
}; 