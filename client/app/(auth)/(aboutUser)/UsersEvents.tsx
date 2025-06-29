import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { useGetUserToViewEvents } from '@/hooks/useGetUserToViewEvents';
import SearchFriendsBar from '@/components/SearchFriendsBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventView from '@/components/Event';
import { Feather } from '@expo/vector-icons';
import { TabFlashList } from '@/components/CollapsibleTab/tab-flash-list';
import { Route } from '@/components/CollapsibleTab';
import { SkeletonBox, EventCardSkeleton } from '@/components/Skeleton';

type UserEventsProps = {
  userId: string;
  route?: Route;
  refreshing?: boolean;
};

const EventSkeleton = () => {
  return (
    <View style={{ marginBottom: 16 }}>
      <EventCardSkeleton />
    </View>
  );
};

export default React.memo(function UserEvents({ userId, route, refreshing }: UserEventsProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [searchQuery, setSearchQuery] = useState('');
  const { eventsList, fetchUserToViewEvents, loading } = useGetUserToViewEvents(userId);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (userId) {
      fetchUserToViewEvents();
    }
  }, [fetchUserToViewEvents, userId]);

  useEffect(() => {
    if (refreshing) {
      fetchUserToViewEvents();
    }
  }, [refreshing, fetchUserToViewEvents]);

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View style={{ marginBottom: 16 }}>
        <EventView key={item._id} event={item} loading={loading} />
      </View>
    );
  };

  const ListEmptyComponent = () => (
    <View style={{ paddingTop: 16, width: '100%' }}>
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
            name="calendar"
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
          No events yet
        </ThemedText>
        <ThemedText 
          style={{ 
            fontSize: 14, 
            color: themeColors.placeholderTextColor,
            textAlign: 'center',
            opacity: 0.8
          }}
        >
          User's Events will appear here once they've attended any
        </ThemedText>
      </View>
    </View>
  );

  const ListHeaderComponent = () => (
    loading ? (
      <View style={{ marginTop: 16, marginBottom: 16 }}>
        <SkeletonBox width="100%" height={40} borderRadius={8} marginBottom={16} />
        <EventSkeleton />
        <EventSkeleton />
      </View>
    ) : eventsList.length > 0 ? (
      <View style={{ marginTop: 16, marginBottom: 16, width: '100%' }}>
        <SearchFriendsBar
          placeholder="Search events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    ) : null
  );

  const filteredEvents = eventsList.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
  });

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 16 }}>
      <TabFlashList
        index={route?.index || 0}
        data={loading ? [] : filteredEvents}
        estimatedItemSize={200}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? ListEmptyComponent : null}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 20
        }}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
});