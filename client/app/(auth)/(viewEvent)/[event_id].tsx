import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Image } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useGetEventById } from '@/hooks/useGetEventById';
import { Event } from '@/types/allTypes';
import EventImage from '@/components/ViewEvent/EventImage';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import EventDetailsSection from '@/components/ViewEvent/EventDetails';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { setStoryPlaying } from '@/store/eventPlayStorySlice';
import { useIsFocused } from '@react-navigation/native';

const ViewEvent = () => {
  const [event, setEvent] = useState<Event | null>(null);
  const { event_id, fromStory } = useLocalSearchParams();
  const id = Array.isArray(event_id) ? event_id[0] : event_id;
  const { fetchEventById, loading } = useGetEventById(id);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const isFocused = useIsFocused();

  useFocusEffect(
    useCallback(() => {
      let unsubscribe: (() => void) | null = null;

      if (fromStory) {
        unsubscribe = navigation.addListener('beforeRemove', () => {
          dispatch(setStoryPlaying(true));
        });
      }

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [fromStory])
  );

  useEffect(() => {
    // Fetch event details using the eventId (dummy example)
    const getEventData = async () => {
      const fetchedEvent = await fetchEventById();
      setEvent(fetchedEvent);
    }
    
    getEventData();
  }, []);

  if (!event) {
    return <Text>Loading...</Text>;
  }

  return ( isFocused && (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          width: '100%',
          paddingBottom: insets.bottom 
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', paddingTop: 32 }}>
          <View style={{ alignItems: 'center', borderRadius: 16, overflow: 'hidden' }}>
            <EventImage event_picture={event?.event_picture ?? null} />
          </View>
        </View>
        <View style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
          <EventDetailsSection event={event} />
        </View>
      </ScrollView>
    </ThemedView>
  ));
};

export default ViewEvent;