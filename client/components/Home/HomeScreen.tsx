import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import Header from '@/components/Header';
import UpcomingEvents from '@/components/Home/UpcomingEvents';
import { ThemedView } from '@/components/ThemedView';
import PastEvents from '@/components/Home/PastEvents';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AttentionRequired from './AttentionRequired';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { cacheManager } from '@/utils/homeScreenCache';
import { useFocusEffect } from '@react-navigation/native';
import CacheDebugInfo from './CacheDebugInfo';

// Simple loading state manager
interface LoadingState {
  upcomingEvents: boolean;
  attentionRequired: boolean;
  pastEvents: boolean;
}

const useLoadingManager = () => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({
    upcomingEvents: true,
    attentionRequired: true,
    pastEvents: true,
  });

  // Check if any section is loading
  const isAnyLoading = useMemo(() => 
    Object.values(loadingStates).some(loading => loading), 
    [loadingStates]
  );

  // Update specific section loading state
  const setLoading = useCallback((section: keyof LoadingState, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [section]: loading
    }));
  }, []);

  // Start refresh for all sections
  const startRefresh = useCallback(() => {
    setLoadingStates({
      upcomingEvents: true,
      attentionRequired: true,
      pastEvents: true,
    });
  }, []);

  // Get loading state for specific section
  const isLoading = useCallback((section: keyof LoadingState) => 
    loadingStates[section], 
    [loadingStates]
  );

  return {
    isAnyLoading,
    isLoading,
    setLoading,
    startRefresh,
  };
};

const HomeScreen = React.memo(() => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { isAnyLoading, isLoading, setLoading, startRefresh } = useLoadingManager();

  // Initialize cache manager
  useEffect(() => {
    console.log('🔧 [Cache Manager] Starting cleanup service');
    cacheManager.startCleanup();
    
    return () => {
      console.log('🔧 [Cache Manager] Stopping cleanup service');
      cacheManager.stopCleanup();
    };
  }, []);

  // Log cache stats when focused (for debugging)
  useFocusEffect(
    React.useCallback(() => {
      if (__DEV__) {
        const stats = cacheManager.getAllStats();
        console.log('📊 [Cache Stats]', JSON.stringify(stats, null, 2));
      }
    }, [])
  );

  const onRefresh = useCallback(() => {
    console.log('🔄 [Home Screen] Pull-to-refresh triggered, clearing all caches');
    // Clear all caches on manual refresh to ensure fresh data
    cacheManager.clearAll();
    
    // Start refresh for all sections
    startRefresh();
  }, [startRefresh]);

  const onFinishRefreshUpcomingEvents = useCallback(() => {
    setLoading('upcomingEvents', false);
  }, [setLoading]);

  const onFinishRefreshAttentionRequired = useCallback(() => {
    setLoading('attentionRequired', false);
  }, [setLoading]);

  const onFinishRefreshPastEvents = useCallback(() => {
    setLoading('pastEvents', false);
  }, [setLoading]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        stickyHeaderIndices={[0]}
        stickyHeaderHiddenOnScroll={true}
        style={{ flex: 1 }}
        scrollEventThrottle={16}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isAnyLoading} 
            onRefresh={onRefresh}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.mountainGreen]}
          />
        }
      >
        <ThemedView
          style={{
            flex: 1,
            marginBottom: 6
          }}
        >
          <Header refreshing={isAnyLoading}/>
        </ThemedView>
        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24, paddingBottom: tabBarHeight }}>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
            <UpcomingEvents 
              refreshing={isLoading('upcomingEvents')} 
              onFinishRefresh={onFinishRefreshUpcomingEvents} 
            />
          </ThemedView>
          <ThemedView style={{ width: '100%' }}>
            <AttentionRequired 
              refreshing={isLoading('attentionRequired')} 
              onFinishRefresh={onFinishRefreshAttentionRequired} 
            />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
            <PastEvents 
              refreshing={isLoading('pastEvents')} 
              onFinishRefresh={onFinishRefreshPastEvents}
            />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
});

HomeScreen.displayName = 'HomeScreen';

export default HomeScreen;