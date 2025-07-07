import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import EventComponent from '@/components/Event';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useGetFriendsEvents } from '@/hooks/useGetFriendsEvents';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Event } from '@/types/allTypes';
import { useRouter } from 'expo-router';
import { EventCardSkeleton, SkeletonBox } from '../Skeleton';
import { useFocusEffect } from '@react-navigation/native';

interface FriendsEventsProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

const FriendsEvents: React.FC<FriendsEventsProps> = React.memo(({ refreshing, onFinishRefresh }) => {
  const { fetchFriendsEvents, loading, isFirstFetch } = useGetFriendsEvents();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [friendsEvents, setFriendsEvents] = useState<Event[]>([]);
  const router = useRouter();

  const navigateToAllFriendsEvents = () => {
    router.push('/(auth)/friends-events');
  }

  const fetchEvents = async () => {
    const events = await fetchFriendsEvents();
    if (events && Array.isArray(events)) {
      setFriendsEvents(events);
    } else {
      setFriendsEvents([]);
    }
    onFinishRefresh();
  }
  
  useEffect(() => {
    if (refreshing) {
      fetchEvents();
    }
  }, [refreshing]);

  // Auto-recovery when screen comes into focus (for server reconnection scenarios)
  useFocusEffect(
    React.useCallback(() => {
      if (refreshing) {
        fetchEvents();
      }
    }, [refreshing])
  );

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, []);

  // Show skeleton only on first fetch, not on refreshes
  const showSkeleton = isFirstFetch && loading;

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Friends' Events</ThemedText>
        <TouchableOpacity 
          style={{ alignItems: 'center', backgroundColor: 'transparent' }}
          onPress={navigateToAllFriendsEvents}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 16, marginRight: 4 }}>View All</ThemedText>
            <IconSymbol
              name="chevron.right"
              size={12}
              color={Colors[colorScheme ?? 'dark'].tint}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Event List */}
      <View style={{ flex: 1 }}>
        {showSkeleton ? (
          <SkeletonBox width={'100%'} height={120} borderRadius={16} />
        ) : (
          friendsEvents.length > 0 ? (
          <View style={{ gap: 16 }}>
            {friendsEvents.slice(0, 3).map((event, index) => (
                <View key={`${event._id}-${index}`}>
                <EventComponent event={event} loading={refreshing || loading}/>
                </View>
            ))}
          </View>
          ) : (
            <ThemedView style={{
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
                <IconSymbol
                  name="person.2.fill"
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
                No friends' events found
              </ThemedText>
              <ThemedText 
                style={{ 
                  fontSize: 14, 
                  color: themeColors.placeholderTextColor,
                  textAlign: 'center',
                  opacity: 0.8
                }}
              >
                Your friends haven't created any events yet
              </ThemedText>
            </ThemedView>
          )
        )}
      </View>
    </ThemedView>
  );
});

export default FriendsEvents; 