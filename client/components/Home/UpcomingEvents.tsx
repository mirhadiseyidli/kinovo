import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import EventComponent from '@/components/Event';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useGetMyEvents } from '@/hooks/useGetMyEvents';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useFocusEffect } from '@react-navigation/native';
import { Event } from '@/types/allTypes';
import { AutoSkeletonView } from 'react-native-auto-skeleton';

const UpcomingEvents: React.FC<{ refreshing: boolean; onFinishRefresh: () => void }> = ({ refreshing, onFinishRefresh }) => {
  const { fetchMyEvents } = useGetMyEvents();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [myEventsList, setMyEventsList] = useState<Event[]>([]);

  if (!myEventsList) {
    <ThemedText>Could't load events</ThemedText>
  };
  
  const fetchEvents = async () => {
    const myEvents = await fetchMyEvents();
    const now = new Date();
    const upcomingEvents = myEvents
      .filter((event: Event) => event.start_time !== null && new Date(event.start_time) >= now)
      .sort((a: Event, b: Event) =>
        new Date(a.start_time ?? 0).getTime() - new Date(b.start_time ?? 0).getTime()
      )
      .slice(0, 3);
    setMyEventsList(upcomingEvents);
    onFinishRefresh();
  }
  
  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
    }, [refreshing])
  );

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      {/* Header */}
      <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <AutoSkeletonView 
          isLoading={refreshing} 
          shimmerBackgroundColor={themeColors.background} 
          gradientColors={[
            themeColors.background, 
            themeColors.inputBackgroundColor
          ]}
        >
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Upcoming Events</ThemedText>
        </AutoSkeletonView>
        <TouchableOpacity style={{ alignItems: 'center' }}>
          <AutoSkeletonView 
            isLoading={refreshing} 
            shimmerBackgroundColor={themeColors.background} 
            gradientColors={[
              themeColors.background, 
              themeColors.inputBackgroundColor
            ]}
          >
            <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 16, marginRight: 4 }}>View Calendar</ThemedText>
              <IconSymbol
                name="chevron.right"
                size={12}
                color={Colors[colorScheme ?? 'dark'].tint}
              />
            </ThemedView>
          </AutoSkeletonView>
        </TouchableOpacity>
      </ThemedView>

      {/* Event List */}
      <View style={{ flex: 1 }}>
        {myEventsList.length > 0 ? (
          <View>
            {myEventsList.map((event, index) => (
              <View key={event._id}>
                <EventComponent event={event} loading={refreshing}/>
                {/* Divider Line */}
                {index < myEventsList.length - 1 && (
                  <View
                    style={{
                      height: 0.3,
                      backgroundColor: Colors[colorScheme ?? 'dark'].border,
                      marginVertical: 16,
                    }}
                  />
                )}
              </View>
            ))}
          </View>
        ) : (
          <AutoSkeletonView 
            isLoading={refreshing} 
            shimmerBackgroundColor={themeColors.background} 
            gradientColors={[
              themeColors.background, 
              themeColors.inputBackgroundColor
            ]}
          >
            <ThemedText 
              style={{ 
                fontSize: 16, 
                color: themeColors.placeholderTextColor,
                textAlign: 'center'
              }}
            >
              {`No upcoming events yet.\nStart something fun — create your first event! 🎉`}
            </ThemedText>
          </AutoSkeletonView>
        )}
      </View>
    </ThemedView>
  );
};

export default UpcomingEvents;
