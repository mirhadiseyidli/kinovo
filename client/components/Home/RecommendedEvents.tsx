import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Event } from '@/types/allTypes';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useRouter } from 'expo-router';
import { useGetRecommendedEvents } from '@/hooks/useGetRecommendedEvents';
import EventComponent from '@/components/Event';
import { useFocusEffect } from '@react-navigation/native';

interface RecommendedEventsProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

const RecommendedEvents: React.FC<RecommendedEventsProps> = React.memo(({ refreshing, onFinishRefresh }) => {
  const { fetchRecommendedEvents, loading } = useGetRecommendedEvents();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const router = useRouter();

  const navigateToExplore = () => {
    router.push('/(auth)/(tabs)/explore');
  };

  const fetchEvents = async () => {
    const events = await fetchRecommendedEvents();
    if (events && Array.isArray(events)) {
      setRecommendedEvents(events);
    } else {
      setRecommendedEvents([]);
    }
    onFinishRefresh();
  };

  useFocusEffect(
    React.useCallback(() => {
      if (refreshing) {
        fetchEvents();
      }
    }, [refreshing])
  );

  if (recommendedEvents.length === 0) {
    return null;
  }

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
      }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
          Events You Might Like
        </ThemedText>
        <TouchableOpacity 
          style={{ alignItems: 'center', backgroundColor: 'transparent' }}
          onPress={navigateToExplore}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 16, marginRight: 4 }}>
              Explore More
            </ThemedText>
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
        <View>
          {recommendedEvents.map((event, index) => (
            <View key={`${event._id}-${index}`}>
              <EventComponent event={event} loading={refreshing || loading}/>
              {/* Divider Line */}
              {index < recommendedEvents.length - 1 && (
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
      </View>
    </ThemedView>
  );
});

export default RecommendedEvents; 