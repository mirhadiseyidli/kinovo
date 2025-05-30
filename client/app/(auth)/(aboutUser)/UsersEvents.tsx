import React, { useState } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import EventName from '@/components/CreateEvent/EventName';
import EventImage from '@/components/CreateEvent/EventImage';
import Category from '@/components/CreateEvent/EventType';
import Description from '@/components/CreateEvent/Description';
import { ButtonWithLabel } from '@/components/ButtonWithLabel';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import type { User, UserProp, EventProp } from '@/types/allTypes';
import { useGetUserToViewFriends } from '@/hooks/useGetUserToViewFriends';
import { useFocusEffect } from '@react-navigation/native';
import SearchFriendsBar from '@/components/SearchFriendsBar';
import { useGetUserToViewEvents } from '@/hooks/useGetUserToViewEvents';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import EventView from '@/components/Event';

export default React.memo(function UserEvents({ user }: UserProp) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [searchQuery, setSearchQuery] = useState('');
  const { eventsList, refetchUserToViewEvents, loading } = useGetUserToViewEvents(user?._id);
  // const { friendsList, refetchUserToViewFriends , loading } = useGetUserToViewFriends(user?._id);
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      refetchUserToViewEvents();
    }, [refetchUserToViewEvents])
  );

  return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center' }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }} style={{ width: '100%', paddingBottom: tabBarHeight }}>
          <View style={{ flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            {loading ? (
              <ThemedText 
                style={{ 
                  fontSize: 16, 
                  color: themeColors.placeholderTextColor, 
                  marginTop: 32,
                  textAlign: 'center'
                }}
              >
                Loading...
              </ThemedText>
            ) : eventsList.length > 0 ? (
              <>
                <View style={{ marginTop: 16, marginBottom: 16, width: '100%' }}>
                  <SearchFriendsBar
                    placeholder="Search events..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                {eventsList.map((event) => (
                  <EventView
                    key={event._id}
                    event={event}
                    loading={false}
                  />
                ))}
              </>
            ) : (
              <ThemedText 
                style={{ 
                  fontSize: 16, 
                  color: themeColors.placeholderTextColor, 
                  marginTop: 32,
                  textAlign: 'center'
                }}
              >
                {`Looks like it\'s just you for now!\nAdd some friends to get started!`}
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
  );
});