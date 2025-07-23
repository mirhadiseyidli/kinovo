import React, { useCallback } from 'react';
import { View, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { jwtDecode } from 'jwt-decode';
import Feather from '@expo/vector-icons/Feather';
import DefaultProfilePicture from '@/components/DefaultProfilePicture';
import { InfiniteEventsList } from '@/components/InfiniteList';
import { InfiniteEvent as Event, useInfiniteEventsQuery } from '@/hooks/useInfiniteEventsQuery';
import EventComponent from '@/components/Event';

/**
 * Friends Events Page with Infinite Scrolling
 * 
 * This page replaces the original friends-events.tsx with:
 * - Infinite scrolling for better performance with large lists
 * - Automatic background refetching and cache management
 * - Smooth loading states and error handling
 * - Pull-to-refresh functionality
 * - Proper TypeScript typing
 */

const FriendsEventsInfinitePage = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const { accessToken, userId } = useAuthSession();

  // Get event count for the header - using the same query as InfiniteEventsList
  const { events, totalCount, isFetchingNextPage } = useInfiniteEventsQuery({
    eventType: 'friends',
    userId,
    pageSize: 10,
    enabled: Boolean(userId),
  });

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  // Custom event item renderer with friend info
  const renderEventItem = useCallback((event: Event, index: number) => {
    // Ensure event and creator exist
    if (!event || !event.creator) {
      console.warn('Event or creator is missing:', event);
      return null;
    }
    
    const isCreator = userId && event.creator._id === userId;
    
    return (
      <ThemedView style={{ overflow: 'hidden', marginBottom: 32 }}>
        {/* Friend Info */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: themeColors.background,
          marginBottom: 16,
          paddingHorizontal: 16,
        }}>
          <DefaultProfilePicture
            profilePicture={event.creator.profile_picture}
            fullName={event.creator.full_name}
            size={40}
            borderRadius={20}
          />
          <View style={{ marginLeft: 12 }}>
            <ThemedText style={{ fontWeight: 'bold' }}>
              {event.creator.full_name || 'Unknown User'}
            </ThemedText>
            <ThemedText style={{ fontSize: 14, color: themeColors.textSecondary }}>
              {isCreator ? 'is hosting' : 'is attending'}
            </ThemedText>
          </View>
        </View>
        
        {/* Event Card */}
        <View style={{ paddingHorizontal: 16 }}>
          <EventComponent event={event} loading={false} />
        </View>
      </ThemedView>
    );
  }, [userId, themeColors]);

  // Custom empty state
  const renderEmptyState = useCallback(() => {
    return (
      <View style={{ flex: 1 }}>
        {/* Empty State */}
        <ThemedView style={{
          backgroundColor: themeColors.background,
          borderRadius: 12,
          padding: 16,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: themeColors.border,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
        }}>
          <View style={{ marginBottom: 8 }}>
            <IconSymbol
              name="person.2.fill"
              size={48}
              color={themeColors.placeholderTextColor}
            />
          </View>
          <ThemedText style={{
            fontSize: 20,
            color: themeColors.placeholderTextColor,
            textAlign: 'center',
            marginBottom: 8,
            fontWeight: '600'
          }}>
            No friends' events found
          </ThemedText>
          <ThemedText style={{
            fontSize: 14,
            color: themeColors.placeholderTextColor,
            textAlign: 'center',
            opacity: 0.8,
            lineHeight: 24,
          }}>
            Your friends haven't created any events yet.{'\n'}
            Check back later or invite them to create events!
          </ThemedText>
        </ThemedView>
      </View>
    );
  }, [themeColors]);

  // Custom loading state
  const renderLoadingState = useCallback(() => {
    return (
      <View style={{ flex: 1 }}>
        {/* Loading State */}
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 60,
        }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: themeColors.background,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <IconSymbol
              name="person.2.fill"
              size={24}
              color={themeColors.text}
            />
          </View>
          <ThemedText style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: themeColors.text,
            marginBottom: 8,
          }}>
            Loading friends' events...
          </ThemedText>
          <ThemedText style={{
            fontSize: 14,
            color: themeColors.textSecondary,
            textAlign: 'center',
          }}>
            Please wait while we fetch your friends' events
          </ThemedText>
        </View>
      </View>
    );
  }, [themeColors]);

  // Custom error state
  const renderErrorState = useCallback((error: any, retry: () => void) => {
    return (
      <View style={{ flex: 1 }}>
        {/* Error State */}
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 60,
        }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: themeColors.background,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={24}
              color={themeColors.text}
            />
          </View>
          <ThemedText style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: themeColors.text,
            marginBottom: 8,
            textAlign: 'center',
          }}>
            Failed to load friends' events
          </ThemedText>
          <ThemedText style={{
            fontSize: 14,
            color: themeColors.textSecondary,
            textAlign: 'center',
            marginBottom: 20,
            lineHeight: 20,
          }}>
            {error?.message || 'An unexpected error occurred.'}
            {'\n'}Please check your connection and try again.
          </ThemedText>
          <TouchableOpacity
            style={{
              backgroundColor: themeColors.background,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={retry}
          >
            <ThemedText style={{
              color: themeColors.text,
              fontSize: 16,
              fontWeight: 'bold',
            }}>
              Try Again
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [themeColors]);

  // Header component that will be part of the scrollable content (when there are events)
  const renderListHeader = useCallback(() => (
    <View style={{ marginBottom: 16 }}>
      {/* Header Card */}
      <ThemedView style={{
        backgroundColor: themeColors.mountainGreen,
        padding: 16,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
      }}>
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
      <ThemedView style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
          Friends' Events
        </ThemedText>
        
        {/* Show event count with loading indicator */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isFetchingNextPage && (
            <View style={{
              backgroundColor: themeColors.tint,
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginRight: 8,
            }}>
              <ThemedText style={{ 
                color: '#fff',
                fontSize: 9,
                fontWeight: '600'
              }}>
                Loading...
              </ThemedText>
            </View>
          )}
          <ThemedText style={{ color: themeColors.textSecondary }}>
            {`${events.length} events`}
            {totalCount > 0 && events.length < totalCount && (
              <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                {' '}of {totalCount}
              </ThemedText>
            )}
          </ThemedText>
        </View>
      </ThemedView>
    </View>
  ), [themeColors, events.length, totalCount, isFetchingNextPage]);

  if (!userId) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>Please log in to view friends' events</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 16 }}>
      <InfiniteEventsList
        eventType="friends"
        userId={userId}
        pageSize={10}
        useFlashList={true}
        renderItem={renderEventItem}
        renderEmptyState={renderEmptyState}
        renderLoadingState={renderLoadingState}
        renderErrorState={renderErrorState}
        ListHeaderComponent={renderListHeader}
        estimatedItemSize={200}
        onEndReachedThreshold={0.5}
        enableSmooth={true}
        keepPreviousData={true}
        staleTime={1000 * 60 * 5} // 5 minutes
        gcTime={1000 * 60 * 30} // 30 minutes
        testID="friends-events-infinite-list"
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </ThemedView>
  );
};

export default FriendsEventsInfinitePage;