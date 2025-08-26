import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Route } from '@/components/CollapsibleTab';
import { TabFlashList } from '@/components/CollapsibleTab/tab-flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetUserToViewActivities } from '@/hooks/useGetUserToViewActivities';
import { getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';
import { SkeletonBox } from '@/components/Skeleton';

type UserActivitiesProps = {
  userId: string;
  route?: Route;
  refreshing?: boolean;
};

const ActivitySkeleton = () => {
  return (
    <View 
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8
      }}
    >
      <SkeletonBox width={'100%'} height={56} borderRadius={8}/>
    </View>
  );
};

export default React.memo(function UserActivities({ userId, route, refreshing }: UserActivitiesProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [searchQuery, setSearchQuery] = useState('');
  const { activities, fetchUserToViewActivities, loading, isFirstFetch } = useGetUserToViewActivities(userId);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (userId) {
      fetchUserToViewActivities();
    }
  }, [fetchUserToViewActivities, userId]);

  // Add effect to handle refreshing
  useEffect(() => {
    if (refreshing) {
      fetchUserToViewActivities();
    }
  }, [refreshing, fetchUserToViewActivities]);
  
  const renderItem = ({ item }: { item: string }) => {
    const iconName = getCategoryIcon(item);
    const iconColor = getCategoryColor(item);
    
    return (
      <View 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: themeColors.background,
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: themeColors.border,
          marginBottom: 16,
        }}
      >
        <MaterialCommunityIcons name={iconName} size={24} color={iconColor} style={{ marginRight: 12 }} />
        <ThemedText style={{ fontSize: 16 }}>{item}</ThemedText>
      </View>
    );
  };

  const ListEmptyComponent = () => (
    <View style={{
      backgroundColor: themeColors.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: themeColors.border,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
    }}>
      <View style={{ marginBottom: 12 }}>
        <Feather
          name="activity"
          size={32}
          color={themeColors.placeholderTextColor}
        />
      </View>
      <ThemedText 
        style={{ 
          fontSize: 16, 
          color: themeColors.placeholderTextColor, 
          textAlign: 'center',
          marginBottom: 4,
          fontWeight: '600'
        }}
      >
        No favorite activities yet
      </ThemedText>
      <ThemedText 
        style={{ 
          fontSize: 14, 
          color: themeColors.placeholderTextColor,
          textAlign: 'center',
          opacity: 0.8
        }}
      >
        This user hasn't added any favorite activities yet
      </ThemedText>
    </View>
  );

  const ListHeaderComponent = () => (
    isFirstFetch ? (
      <View style={{ gap: 16 }}>
        <ActivitySkeleton />
        <ActivitySkeleton />
        <ActivitySkeleton />
      </View>
    ) : null
  );

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      <TabFlashList
        index={route?.index || 0}
        data={isFirstFetch ? [] : activities}
        renderItem={renderItem}
        ListEmptyComponent={!isFirstFetch ? ListEmptyComponent : null}
        ListHeaderComponent={ListHeaderComponent}
        numColumns={1}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 20
        }}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
});