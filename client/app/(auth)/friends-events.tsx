import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useGetFriendsEvents } from '@/hooks/useGetFriendsEvents';
import { Event } from '@/types/allTypes';
import { format } from 'date-fns';
import EventComponent from '@/components/Event';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ActivityIndicator } from 'react-native';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { jwtDecode } from 'jwt-decode';
import Feather from '@expo/vector-icons/Feather';
import DefaultProfilePicture from '@/components/DefaultProfilePicture';
import { SkeletonBox, EventCardSkeleton } from '@/components/Skeleton';

const FriendsEventsPage = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const { fetchFriendsEvents, loading, isFirstFetch } = useGetFriendsEvents();
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { accessToken } = useAuthSession();
  const userId = accessToken?.current ? (jwtDecode(accessToken.current) as any)?._id : null;

  const fetchEvents = async () => {
    const friendsEvents = await fetchFriendsEvents();
    if (friendsEvents) {
      setEvents(friendsEvents);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, []);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerTitle: 'Friends\' Events',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity onPress={goBack}>
              <Feather name="chevron-left" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.mountainGreen}
          />
        }
      >
        {/* Header Card */}
        <ThemedView 
          style={{ 
            backgroundColor: themeColors.mountainGreen,
            padding: 16,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: 16,
            marginTop: 16,
            marginBottom: 16
          }}
        >
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <View style={{ marginBottom: 8 }}>
              <IconSymbol 
                name="person.2.fill" 
                size={48} 
                color="white"
              />
            </View>
            <ThemedText style={{ 
              fontSize: 24, 
              fontWeight: 'bold', 
              color: 'white', 
              marginBottom: 4,
              textAlign: 'center'
            }}>
              Friends' Events
            </ThemedText>
            <ThemedText style={{ 
              fontSize: 16, 
              color: 'white', 
              textAlign: 'center',
              opacity: 0.9
            }}>
              Stay updated with your friends' latest events
            </ThemedText>
          </View>
        </ThemedView>

        {/* Section Header */}
        <ThemedView
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16
          }}
        >
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Friends' Events</ThemedText>
          <ThemedText style={{ color: themeColors.textSecondary }}>
            {isFirstFetch ? '...' : `${events.length} events`}
          </ThemedText>
        </ThemedView>

        <ThemedView style={{ padding: 16 }}>
          {isFirstFetch ? (
            <View style={{ gap: 16 }}>
              <EventCardSkeleton count={1}/>
            </View>
          ) : events.length > 0 ? (
            <View style={{ gap: 24 }}>
              {events.map((event) => (
                <View key={event._id}>
                  <FriendEventCard event={event} userId={userId} />
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
              marginTop: 8,
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
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};

interface FriendEventCardProps {
  event: Event;
  userId: string | null;
}

const FriendEventCard: React.FC<FriendEventCardProps> = ({ event, userId }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const isCreator = userId && event.creator && event.creator._id === userId;

  return (
    <ThemedView style={{ overflow: 'hidden' }}>
      {/* Friend Info */}
      <View 
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          backgroundColor: themeColors.background,
          marginBottom: 16,
        }}
      >
        <DefaultProfilePicture
          profilePicture={event.creator?.profile_picture}
          fullName={event.creator?.full_name}
          size={40}
          borderRadius={20}
        />
        <View style={{ marginLeft: 12 }}>
          <ThemedText style={{ fontWeight: 'bold' }}>
            {event.creator?.full_name || 'Unknown User'}
          </ThemedText>
          <ThemedText style={{ fontSize: 14, color: themeColors.textSecondary }}>
            {isCreator ? 'is hosting' : 'is attending'}
          </ThemedText>
        </View>
      </View>
      
      {/* Event Card */}
      <EventComponent event={event} loading={false} />
    </ThemedView>
  );
};

export default FriendsEventsPage; 