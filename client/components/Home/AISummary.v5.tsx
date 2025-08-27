import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAIInsights } from '@/hooks/useAIInsights';
import type { InsightCard } from '@/hooks/useAIInsights';
import { useHomeError } from '@/context/HomeErrorContext';
import PastEvent from '@/components/Home/PastEvent';
import { WeatherCard } from '@/components/Home/WeatherCard';
import { TrafficCard } from '@/components/Home/TrafficCard';
import { getWeatherGradient, getWeatherConditionFromDescription } from '@/constants/WeatherConditions';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  LinearTransition,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';

// Import shimmer loading component
import { LoadingState } from './ShimmerLoading';

/**
 * AISummary.v5 - HTTP-based with improved animations
 * Features:
 * - Uses simple HTTP requests instead of WebSocket
 * - Fixed layout jumps and invisible component height issues
 * - Proper content visibility animations
 * - Stable height calculations
 * - Smooth shimmer text animation on frontend
 */


interface AISummaryV5Props {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

// Animated shimmer text component for smooth typing effect
const AnimatedInsightText = React.memo<{
  title: string;
  subtitle: string;
  titleStyle: any;
  subtitleStyle: any;
  onAnimationComplete?: () => void;
}>(({ title, subtitle, titleStyle, subtitleStyle, onAnimationComplete }) => {
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [displayedSubtitle, setDisplayedSubtitle] = useState('');
  const [titleComplete, setTitleComplete] = useState(false);

  useEffect(() => {
    if (!title) return;

    let titleIndex = 0;
    const titleInterval = setInterval(() => {
      if (titleIndex < title.length) {
        setDisplayedTitle(title.slice(0, titleIndex + 1));
        titleIndex++;
      } else {
        clearInterval(titleInterval);
        setTitleComplete(true);
      }
    }, 30);

    return () => clearInterval(titleInterval);
  }, [title]);

  useEffect(() => {
    if (!titleComplete || !subtitle) return;

    // Small delay before starting subtitle
    const timeout = setTimeout(() => {
      let subtitleIndex = 0;
      const subtitleInterval = setInterval(() => {
        if (subtitleIndex < subtitle.length) {
          setDisplayedSubtitle(subtitle.slice(0, subtitleIndex + 1));
          subtitleIndex++;
        } else {
          clearInterval(subtitleInterval);
          onAnimationComplete?.();
        }
      }, 25);

      return () => clearInterval(subtitleInterval);
    }, 200);

    return () => clearTimeout(timeout);
  }, [titleComplete, subtitle, onAnimationComplete]);

  return (
    <>
      <ThemedText style={titleStyle}>
        {displayedTitle}
      </ThemedText>
      <ThemedText style={subtitleStyle}>
        {displayedSubtitle}
      </ThemedText>
    </>
  );
});

// Stable animated container that doesn't cause layout jumps
const StableAnimatedContent = React.memo<{
  show: boolean;
  delay?: number;
  children: React.ReactNode;
}>(({ show, delay = 0, children }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (show) {
      opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
      translateY.value = withDelay(delay, withTiming(0, { duration: 300 }));
    } else {
      opacity.value = 0;
      translateY.value = 10;
    }
  }, [show, delay, opacity, translateY]);

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
});

const AISummaryV5 = React.memo<AISummaryV5Props>(({ refreshing, onFinishRefresh }) => {
  const { setComponentError } = useHomeError();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

  // Single state to control the entire UI flow - prevents external state fluctuations
  const [uiState, setUiState] = useState<'loading' | 'animating' | 'complete'>('loading');
  const [stableInsights, setStableInsights] = useState<InsightCard | null>(null);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  // AI Insights hook
  const { insights, refreshWithCacheInvalidation } = useAIInsights({
    enabled: true,
    onError: () => {
      setComponentError('aiInsights', true);
    },
  });

  // Track loading start time
  useEffect(() => {
    if (uiState === 'loading' && !loadingStartTime) {
      setLoadingStartTime(Date.now());
    }
  }, [uiState, loadingStartTime]);

  // Stabilize insights - update when we get more complete data
  useEffect(() => {
    if (insights) {
      // Only update if we have no data yet, or if new data has fullEventData when old didn't
      const shouldUpdate = !stableInsights || 
        (insights.fullEventData && !stableInsights.fullEventData) ||
        (insights.event && !stableInsights.event);
      
      if (shouldUpdate) {
        setStableInsights(insights);
        // Clear any previous error state when insights load successfully
        setComponentError('aiInsights', false);
      }
    }
  }, [insights, stableInsights, setComponentError]);

  // Handle pull to refresh
  const handleRefresh = useCallback(async () => {
    try {
      setUiState('loading');
      setStableInsights(null); // Reset stable insights on refresh
      setLoadingStartTime(Date.now()); // Reset loading start time
      
      // Use cache-invalidating refresh for pull-to-refresh
      await refreshWithCacheInvalidation();
    } catch (error) {
      console.error('Error during refresh:', error);
      setComponentError('aiInsights', true);
    } finally {
      onFinishRefresh();
    }
  }, [refreshWithCacheInvalidation, onFinishRefresh, setComponentError]);

  useEffect(() => {
    if (!refreshing) return;
    handleRefresh();
  }, [refreshing, handleRefresh]);

  // Single effect to manage UI state transitions with minimum 2 second loading time
  useEffect(() => {
    // Only transition from loading to animating once when we have stable data
    if (stableInsights && uiState === 'loading' && loadingStartTime) {
      const elapsedTime = Date.now() - loadingStartTime;
      const minLoadingTime = 2000; // 2 seconds minimum
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      const timeout = setTimeout(() => {
        setUiState('animating');
      }, remainingTime);
      
      return () => clearTimeout(timeout);
    }
  }, [stableInsights, uiState, loadingStartTime]);

  // Event handlers
  const handleCTAPress = useCallback(() => {
    if (!stableInsights?.cta) return;
    
    switch (stableInsights.cta.action) {
      case 'create':
        router.push('/(auth)/(tabs)/create');
        break;
      case 'explore':
        router.push('/(auth)/(tabs)/explore');
        break;
      default:
        // Only support 'create' and 'explore' actions
        break;
    }
  }, [stableInsights?.cta, router]);

  const handleTextAnimationComplete = useCallback(() => {
    setUiState('complete');
  }, []);

  // Memoized renders to prevent re-computation
  const renderEventCard = useMemo(() => {
    if (!stableInsights?.event || !stableInsights?.fullEventData) return null;

    if (!stableInsights.fullEventData._id || !stableInsights.fullEventData.start_time) {
      return null;
    }

    const eventData = {
      ...stableInsights.fullEventData,
      _id: stableInsights.fullEventData._id?.split('-')[0] || stableInsights.fullEventData._id,
      status: stableInsights.fullEventData.status,
      visibility: stableInsights.fullEventData.visibility,
      end_time: stableInsights.fullEventData.end_time || new Date(new Date(stableInsights.fullEventData.start_time).getTime() + 2 * 60 * 60 * 1000),
    };

    return <PastEvent event={eventData} loading={false} />;
  }, [stableInsights?.event, stableInsights?.fullEventData]);

  const weatherBackgroundColors = useMemo(() => {
    if (!stableInsights?.weather?.condition) return [];
    
    const weatherCondition = getWeatherConditionFromDescription(stableInsights.weather.condition);
    if (weatherCondition) {
      return weatherCondition.gradients[colorScheme === 'dark' ? 'dark' : 'light'];
    }
    
    return getWeatherGradient('CLR', colorScheme === 'dark' ? 'dark' : 'light');
  }, [colorScheme, stableInsights?.weather?.condition]);

  const trafficMapImage = useMemo(() => {
    if (stableInsights?.fullEventData?.location?.coordinates?.lat && stableInsights?.fullEventData?.location?.coordinates?.lng) {
      if (stableInsights.fullEventData?.location?.mapSnapshotUrl) {
        const snapshotUrl = colorScheme === 'dark' 
          ? stableInsights.fullEventData.location.mapSnapshotUrl.dark 
          : stableInsights.fullEventData.location.mapSnapshotUrl.light;
        
        if (snapshotUrl) {
          return { uri: snapshotUrl };
        }
      }
    }
    
    const CDN_DOMAIN = 'cdn.kinovo.app';
    const mapPath = 'insight-map';
    
    return colorScheme === 'dark'
      ? { uri: `https://${CDN_DOMAIN}/${mapPath}/map-dark.jpg` }
      : { uri: `https://${CDN_DOMAIN}/${mapPath}/map-light.jpg` };
  }, [colorScheme, stableInsights?.fullEventData?.location?.coordinates, stableInsights?.fullEventData?.location?.mapSnapshotUrl]);

  const renderSubCards = useMemo(() => {
    if (!stableInsights?.weather && !stableInsights?.traffic) return null;

    const eventCoordinates = stableInsights.fullEventData?.location?.coordinates ? {
      lat: stableInsights.fullEventData.location.coordinates.lat,
      lng: stableInsights.fullEventData.location.coordinates.lng
    } : undefined;

    return (
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between',
        gap: 8 
      }}>
        {stableInsights.weather && (
          <WeatherCard 
            weather={stableInsights.weather}
            backgroundColors={weatherBackgroundColors}
            coordinates={eventCoordinates}
          />
        )}
        
        {stableInsights.traffic && (
          <TrafficCard 
            traffic={stableInsights.traffic}
            mapImage={trafficMapImage}
            coordinates={stableInsights.event?.coordinates}
            locationName={stableInsights.event?.location}
          />
        )}
      </View>
    );
  }, [stableInsights?.weather, stableInsights?.traffic, weatherBackgroundColors, trafficMapImage]);

  return (
    <ThemedView
      style={{
        flex: 1,
        width: '100%',
      }}
    >
      {/* Header */}
      <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Your daily insights</ThemedText>
        <TouchableOpacity 
          onPress={() => router.push('/(auth)/(aiAssistant)/AiAssistant.v2')}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {colorScheme === 'dark' ? (
            <Image 
              source={require('@/assets/aiAssistantWhite.gif')}
              style={{ width: 18, height: 18, marginRight: 6, marginTop: 0 }}
              cachePolicy="disk"
              allowDownscaling={true}
            />
          ) : (
            <Image 
              source={require('@/assets/aiAssistant.gif')}
              style={{ width: 18, height: 18, marginRight: 10 }}
              cachePolicy="disk"
              allowDownscaling={true}
            />
          )}
          <ThemedText style={{ fontSize: 16, marginRight: 4 }}>Assistant</ThemedText>
          <IconSymbol
            name="chevron.right"
            size={12}
            color={Colors[colorScheme ?? 'dark'].tint}
          />
        </TouchableOpacity>
      </ThemedView>
      
      {/* Main Content Card */}
      <Animated.View
        // key={uiState} // ensures re-run when loading → animating → complete
        layout={LinearTransition.springify()}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={{
          backgroundColor: themeColors.eventCardBackgroundColor,
          borderRadius: 16,
          overflow: 'hidden',
          padding: 16,
          gap: 8
        }}
      >
        {/* Single conditional render based on UI state */}
        {uiState === 'loading' || !stableInsights ? (
          <>
            <LoadingState
              themeColors={themeColors}
              colorScheme={colorScheme ?? 'dark'}
            />
          </>
        ) : (
          <>
            {/* Animated Text Content - only show when animating or complete */}
            {(uiState === 'animating' || uiState === 'complete') && stableInsights && (
              <AnimatedInsightText
                title={stableInsights.title}
                subtitle={stableInsights.subtitle}
                titleStyle={{
                  fontSize: 16,
                  color: themeColors.text,
                  fontWeight: 'bold',
                }}
                subtitleStyle={{
                  fontSize: 14,
                  color: themeColors.text,
                }}
                onAnimationComplete={handleTextAnimationComplete}
              />
            )}

            {/* CTA Button - only show when complete and NOT showing urgent events */}
            {uiState === 'complete' && stableInsights?.cta && stableInsights?.type !== 'event' && (
              <StableAnimatedContent show={true} delay={100}>
                <TouchableOpacity
                  onPress={handleCTAPress}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: themeColors.eventCardBackgroundColor,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ThemedText style={{ 
                    color: themeColors.text, 
                    fontWeight: '600',
                    fontSize: 14
                  }}>
                    {stableInsights.cta.text || 'Explore'}
                  </ThemedText>
                </TouchableOpacity>
              </StableAnimatedContent>
            )}

            {/* Event Card - only show when complete */}
            {uiState === 'complete' && stableInsights?.type === 'event' && stableInsights?.event && (
              <StableAnimatedContent show={true} delay={200}>
                <View style={{ width: '100%' }}>
                  {renderEventCard}
                </View>
              </StableAnimatedContent>
            )}

            {/* Sub Cards - only show when complete */}
            {uiState === 'complete' && stableInsights?.type === 'event' && (stableInsights?.weather || stableInsights?.traffic) && (
              <StableAnimatedContent show={true} delay={300}>
                <View>
                  {renderSubCards}
                </View>
              </StableAnimatedContent>
            )}
          </>
        )}
      </Animated.View>
    </ThemedView>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to log what's causing re-renders
  const propsEqual = prevProps.refreshing === nextProps.refreshing && 
                     prevProps.onFinishRefresh === nextProps.onFinishRefresh;
  
  
  return propsEqual;
});

AISummaryV5.displayName = 'AISummaryV5';
AnimatedInsightText.displayName = 'AnimatedInsightText';
StableAnimatedContent.displayName = 'StableAnimatedContent';

export default AISummaryV5;