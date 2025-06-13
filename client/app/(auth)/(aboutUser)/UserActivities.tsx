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

type UserActivitiesProps = {
  userId: string;
  route?: Route;
};

export default React.memo(function UserActivities({ userId, route }: UserActivitiesProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const { activities, loading, fetchUserToViewActivities } = useGetUserToViewActivities(userId);
  
  useEffect(() => {
    if (userId) {
      fetchUserToViewActivities();
    }
  }, [fetchUserToViewActivities, userId]);
  
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

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      <TabFlashList
        index={route?.index || 0}
        data={activities}
        estimatedItemSize={70}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? ListEmptyComponent : null}
        numColumns={1}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 20
        }}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
});