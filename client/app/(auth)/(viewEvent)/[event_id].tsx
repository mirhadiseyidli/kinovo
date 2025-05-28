import React, { useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useGetEventById } from '@/hooks/useGetEventById';
import EventImage from '@/components/ViewEvent/EventImage';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import EventDetailsSection from '@/components/ViewEvent/EventDetails';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { setStoryPlaying } from '@/store/eventPlayStorySlice';
import { useIsFocused } from '@react-navigation/native';
import { CreateEventProvider } from '@/context/CreateEventContext';

const ViewEvent = () => {
  const { event_id, fromStory } = useLocalSearchParams();
  const id = Array.isArray(event_id) ? event_id[0] : event_id;
  const { event, loading, error } = useGetEventById(id);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const isFocused = useIsFocused();

  useFocusEffect(
    useCallback(() => {
      let unsubscribe: (() => void) | null = null;

      if (fromStory === "true") {
        unsubscribe = navigation.addListener('beforeRemove', () => {
          dispatch(setStoryPlaying(true));
        });
      }

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [fromStory, navigation, dispatch])
  );

  // Return null when not focused to prevent state updates
  if (!isFocused) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: themeColors.text }}>Loading...</Text>
      </ThemedView>
    );
  }

  // Show error state
  if (error || !event) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: themeColors.text }}>
          {error || 'Event not found'}
        </Text>
      </ThemedView>
    );
  }

  // Show event details
  return (
    <CreateEventProvider>
      <ThemedView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            width: '100%',
            paddingBottom: insets.bottom 
          }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}  // Optimize memory usage
        >
          <View style={{ width: '100%', paddingTop: 32 }}>
            <View style={{ alignItems: 'center', borderRadius: 16, overflow: 'hidden' }}>
              <EventImage event_picture={event.event_picture ?? null} />
            </View>
          </View>
          <View style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
            <EventDetailsSection event={event} />
          </View>
        </ScrollView>
      </ThemedView>
    </CreateEventProvider>
  );
};

export default ViewEvent;