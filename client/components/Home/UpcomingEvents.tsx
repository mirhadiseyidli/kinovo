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
import { useRouter } from 'expo-router';

const UpcomingEvents: React.FC<{ refreshing: boolean; onFinishRefresh: () => void }> = React.memo(({ refreshing, onFinishRefresh }) => {
  const { fetchMyEvents, loading } = useGetMyEvents();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [myEventsList, setMyEventsList] = useState<Event[]>([]);
  const router = useRouter();

  if (!myEventsList) {
    <ThemedText>Could't load events</ThemedText>
  };

  const navigateToCalendar = () => {
    router.push('/(auth)/(tabs)/calendar')
  }
  
  const fetchEvents = async () => {
    const upcomingEvents = await fetchMyEvents();
    const events = upcomingEvents.slice(0, 3);
    setMyEventsList(events);
    onFinishRefresh();
  }
  
  useFocusEffect(
    React.useCallback(() => {
      if (refreshing) {
        fetchEvents();
      }
    }, [refreshing])
  );

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      <AutoSkeletonView 
        isLoading={refreshing || loading} 
        shimmerBackgroundColor={themeColors.background} 
        gradientColors={[
          themeColors.background, 
          themeColors.inputBackgroundColor
        ]}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Upcoming Events</ThemedText>
          <TouchableOpacity 
            style={{ alignItems: 'center', backgroundColor: 'transparent' }}
            onPress={navigateToCalendar}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 16, marginRight: 4 }}>View Calendar</ThemedText>
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
          {myEventsList.length > 0 ? (
            <View>
              {myEventsList.map((event, index) => (
                <View key={`${event._id}-${index}`}>
                  <EventComponent event={event} loading={refreshing || loading}/>
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
            <ThemedText 
              style={{ 
                fontSize: 16, 
                color: themeColors.placeholderTextColor,
                textAlign: 'center'
              }}
            >
              {`No upcoming events yet.\nStart something fun — create your first event! 🎉`}
            </ThemedText>
          )}
        </View>
      </AutoSkeletonView>
    </ThemedView>
  );
});

export default UpcomingEvents;
