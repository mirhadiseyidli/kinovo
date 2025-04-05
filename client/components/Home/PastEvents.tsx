import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import PastEvent from '@/components/Home/PastEvent';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Event } from '@/types/allTypes';
import { AutoSkeletonView } from 'react-native-auto-skeleton';
import { useGetMyPastEvents } from '@/hooks/useGetMyPastEvents';
import { useFocusEffect } from '@react-navigation/native';

const groupEventsByMonth = (events: Event[]) => {
  const grouped: Record<string, Event[]> = {};
  const now = new Date();

  events.forEach((event: Event) => {
    if (!event.start_time) return;

    const eventDate = new Date(event.start_time);
    if (eventDate >= now) return; // only group past events

    const monthName =
      eventDate.getFullYear() === now.getFullYear() && eventDate.getMonth() === now.getMonth()
        ? 'This Month'
        : eventDate.getFullYear() === now.getFullYear() && eventDate.getMonth() === now.getMonth() - 1
        ? 'Last Month'
        : eventDate.toLocaleString('default', { month: 'long' });

    if (!grouped[monthName]) grouped[monthName] = [];
    grouped[monthName].push(event);
  });

  return grouped;
};

const PastEvents: React.FC<{ refreshing: boolean; onFinishRefresh: () => void }> = ({ refreshing, onFinishRefresh }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const tabBarHeight = useBottomTabBarHeight(); // Get the tab bar height dynamically
  const { fetchMyPastEvents } = useGetMyPastEvents();
  const [myPastEventsList, setMyPastEventsList] = useState<Event[]>([]);
  
  const fetchPastEvents = async () => {
    const myPastEvents = await fetchMyPastEvents();
    setMyPastEventsList(myPastEvents);
    onFinishRefresh();
  }
  
  useFocusEffect(
    React.useCallback(() => {
      fetchPastEvents();
    }, [refreshing])
  );

  const groupedEvents = useMemo(() => {
    if (!myPastEventsList || myPastEventsList.length === 0) return {};

    return groupEventsByMonth(myPastEventsList);
  }, [myPastEventsList]);
  

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{
          paddingBottom: tabBarHeight / 1.5, // Add padding equal to the tab bar height
        }}
      >
        {/* Header Section */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <AutoSkeletonView 
            isLoading={refreshing} 
            shimmerBackgroundColor={themeColors.background} 
            gradientColors={[
              themeColors.background, 
              themeColors.inputBackgroundColor
            ]}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
              Event History
            </ThemedText>
          </AutoSkeletonView>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AutoSkeletonView 
              isLoading={refreshing} 
              shimmerBackgroundColor={themeColors.background} 
              gradientColors={[
                themeColors.background, 
                themeColors.inputBackgroundColor
              ]}
            >
              <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedText style={{ fontSize: 16, marginRight: 8 }}>Filter</ThemedText>
                <Feather name="filter" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
              </ThemedView>
            </AutoSkeletonView>
          </TouchableOpacity>
        </View>

        {/* Events Grouped by Month */}
        {!myPastEventsList || myPastEventsList.length === 0 ? (
            <ThemedText>Could't load events</ThemedText>
        ) : (
          <View style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(groupedEvents).map(([month, events]) => (
              <View key={month} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AutoSkeletonView 
                  isLoading={refreshing} 
                  shimmerBackgroundColor={themeColors.background} 
                  gradientColors={[
                    themeColors.background, 
                    themeColors.inputBackgroundColor
                  ]}
                >
                  <ThemedText style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
                    {month}
                  </ThemedText>
                </AutoSkeletonView>
                {events.map((event) => (
                  <PastEvent
                    key={event._id}
                    event={event}
                    loading={refreshing}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
};

export default PastEvents;