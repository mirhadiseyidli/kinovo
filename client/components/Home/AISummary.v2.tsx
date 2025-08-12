import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import Reanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  withSequence,
  withDelay,
  runOnJS,
  cancelAnimation,
  useDerivedValue,
  Easing
} from 'react-native-reanimated';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import LinearGradient from 'react-native-linear-gradient';
import { ImageBackground } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAIInsightsQuery } from '@/hooks/useAIInsightsQuery';
import { useHomeError } from '@/context/HomeErrorContext';
import PastEvent from '@/components/Home/PastEvent';
import { getWeatherGradient, getWeatherConditionFromDescription, getWeatherEmoji } from '@/constants/WeatherConditions';

/**
 * TanStack React Query version of AISummary component
 * Following the same pattern as UpcomingEvents.v2
 */

// AnimatedTypingText component using react-native-reanimated v4
interface AnimatedTypingTextProps {
  text: string;
  progress: Reanimated.SharedValue<number>;
  showCursor: Reanimated.SharedValue<boolean>;
  cursorOpacity: Reanimated.SharedValue<number>;
  style: any;
  cursorStyle: any;
}

const AnimatedTypingText: React.FC<AnimatedTypingTextProps> = React.memo(({ 
  text, 
  progress, 
  showCursor, 
  cursorOpacity, 
  style, 
  cursorStyle 
}) => {
  const [visibleText, setVisibleText] = useState('');
  const lastLengthRef = useRef(0);

  const animatedCursorStyle = useAnimatedStyle(() => {
    return {
      opacity: showCursor.value ? withTiming(cursorOpacity.value, {
        duration: 530,
        easing: Easing.inOut(Easing.ease)
      }) : withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.ease)
      })
    };
  });

  // Update text on JS thread using runOnJS - only when length changes
  const updateVisibleText = useCallback((newText: string) => {
    setVisibleText(newText);
  }, []);

  // Use derived value to track progress and update text via runOnJS
  // Optimized with Reanimated 4.0 - reduced frequency of runOnJS calls
  useDerivedValue(() => {
    const currentLength = Math.floor(progress.value * text.length);
    
    // Only update if the character count actually changed
    if (currentLength !== lastLengthRef.current) {
      const newVisibleText = text.slice(0, currentLength);
      runOnJS(updateVisibleText)(newVisibleText);
      lastLengthRef.current = currentLength;
    }
    
    return currentLength;
  }, [text.length]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <Text style={style}>{visibleText}</Text>
      <Reanimated.View style={animatedCursorStyle}>
        <Reanimated.Text style={cursorStyle}>|</Reanimated.Text>
      </Reanimated.View>
    </View>
  );
});

// Loading text component using reanimated
const LoadingTypingText: React.FC<{ progress: Reanimated.SharedValue<number>; style: any }> = React.memo(({ progress, style }) => {
  const [visibleText, setVisibleText] = useState('');
  const fullText = 'Getting your personalized insights...';
  const lastLengthRef = useRef(0);

  const updateLoadingText = useCallback((newText: string) => {
    setVisibleText(newText);
  }, []);

  useDerivedValue(() => {
    const currentLength = Math.floor(progress.value * fullText.length);
    
    // Only update if the character count actually changed
    if (currentLength !== lastLengthRef.current) {
      const newVisibleText = fullText.slice(0, currentLength);
      runOnJS(updateLoadingText)(newVisibleText);
      lastLengthRef.current = currentLength;
    }
    
    return currentLength;
  }, [fullText.length]); // Added dependency array for better optimization

  return <Text style={style}>{visibleText}</Text>;
});

interface AISummaryProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

const AISummary = React.memo<AISummaryProps>(({ refreshing, onFinishRefresh }) => {
  const { data: insight, isLoading, isError, error, isFetching } = useAIInsightsQuery({
    onFinishRefresh,
  });
  const { setComponentError } = useHomeError();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const loadingProgress = useSharedValue(0);
  const [showContent, setShowContent] = useState(false);
  const loadingSlideX = useSharedValue(-300);
  const cursorOpacity = useSharedValue(1);
  const loggedTrafficRef = useRef(false);
  const currentInsightRef = useRef<string | null>(null);
  
  // Reanimated values for typing animation
  const titleProgress = useSharedValue(0);
  const subtitleProgress = useSharedValue(0);
  const showTitleCursor = useSharedValue(false);
  const showSubtitleCursor = useSharedValue(false);
  const contentOpacity = useSharedValue(0);
  const router = useRouter();

  // All useAnimatedStyle hooks must be at the top level
  const loadingShimmerStyle = useAnimatedStyle(() => ({
    width: '100%',
    height: '100%',
    position: 'absolute',
    left: 0,
    transform: [
      {
        translateX: loadingSlideX.value,
      },
    ],
  }));

  const ctaButtonStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      {
        translateY: withTiming(showContent ? 0 : 10, {
          duration: 600,
          easing: Easing.out(Easing.ease)
        })
      }
    ]
  }));

  const eventCardStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      {
        translateY: withTiming(showContent ? 0 : 20, {
          duration: 800,
          easing: Easing.out(Easing.ease)
        })
      }
    ]
  }));

  const subCardsStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      {
        translateY: withTiming(showContent ? 0 : 30, {
          duration: 1000,
          easing: Easing.out(Easing.ease)
        })
      }
    ]
  }));

  // Error handling - report to HomeErrorContext (same pattern as other components)
  React.useEffect(() => {
    setComponentError('aiInsights', isError);
  }, [isError, setComponentError]);

  useEffect(() => {
    // Loading shimmer animation using reanimated v4
    loadingSlideX.value = withRepeat(
      withTiming(300, {
        duration: 2500,
        easing: Easing.linear
      }),
      -1,
      false
    );

    // Cursor blinking animation using reanimated v4
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0, {
          duration: 530,
          easing: Easing.inOut(Easing.ease)
        }),
        withTiming(1, {
          duration: 530,
          easing: Easing.inOut(Easing.ease)
        })
      ),
      -1,
      false
    );
  }, []);

  // Loading text animation using reanimated
  useEffect(() => {
    if (!isLoading) {
      cancelAnimation(loadingProgress);
      loadingProgress.value = 0;
      return;
    }

    const fullText = 'Getting your personalized insights...';
    const duration = fullText.length * 50; // Same timing as before
    
    loadingProgress.value = withTiming(1, {
      duration: duration,
    });

    return () => {
      cancelAnimation(loadingProgress);
    };
  }, [isLoading, loadingProgress]);

  // Animated typing with react-native-reanimated - renders once, animates reveal
  useEffect(() => {
    if (!insight || isLoading) {
      // Cancel any running animations
      cancelAnimation(titleProgress);
      cancelAnimation(subtitleProgress);
      cancelAnimation(showTitleCursor);
      cancelAnimation(showSubtitleCursor);
      
      // Reset values
      titleProgress.value = 0;
      subtitleProgress.value = 0;
      showTitleCursor.value = false;
      showSubtitleCursor.value = false;
      contentOpacity.value = 0;
      setShowContent(false);
      currentInsightRef.current = null;
      return;
    }

    // Only restart animation if insight actually changed
    const insightKey = `${insight.title}-${insight.subtitle}`;
    if (currentInsightRef.current === insightKey) {
      return;
    }
    currentInsightRef.current = insightKey;

    // Reset animation states
    setShowContent(false);
    titleProgress.value = 0;
    subtitleProgress.value = 0;
    showTitleCursor.value = false;
    showSubtitleCursor.value = false;
    contentOpacity.value = 0;

    // Calculate animation durations based on text length
    const titleDuration = Math.max(insight.title.length * 40, 800); // Min 800ms
    const subtitleDuration = Math.max(insight.subtitle.length * 25, 600); // Min 600ms

    // Start typing animation sequence
    showTitleCursor.value = true;
    
    titleProgress.value = withTiming(1, {
      duration: titleDuration,
    }, (finished) => {
      if (finished) {
        // Title complete, start subtitle
        showTitleCursor.value = false;
        showSubtitleCursor.value = true;
        
        subtitleProgress.value = withTiming(1, {
          duration: subtitleDuration,
        }, (finished) => {
          if (finished) {
            showSubtitleCursor.value = false;
            runOnJS(setShowContent)(true);
            // Fade in content with smooth animation
            contentOpacity.value = withTiming(1, {
              duration: 800,
              easing: Easing.out(Easing.ease)
            });
          }
        });
      }
    });

    return () => {
      // Cleanup animations on unmount or dependency change
      cancelAnimation(titleProgress);
      cancelAnimation(subtitleProgress);
      cancelAnimation(showTitleCursor);
      cancelAnimation(showSubtitleCursor);
    };
  }, [insight, isLoading, titleProgress, subtitleProgress, showTitleCursor, showSubtitleCursor]);

  const handleCTAPress = useCallback(() => {
    if (!insight?.cta) return;
    
    switch (insight.cta.action) {
      case 'navigate':
        if (insight.cta.target) {
          router.push(insight.cta.target as any);
        }
        break;
      case 'create':
        router.push('/(auth)/(tabs)/create');
        break;
      case 'explore':
        router.push('/(auth)/(tabs)/explore');
        break;
    }
  }, [insight?.cta, router]);

  const renderEventCard = useCallback(() => {
    if (!insight?.event) return null;

    // Convert insight event data to Event object format expected by PastEvent
    // Try to construct a proper date from the insight date and time fields
    let eventDateTime;
    try {
      // If the date field is a relative term like "Today", "Tomorrow", convert it
      const today = new Date();
      if (insight.event.date.toLowerCase() === 'today') {
        eventDateTime = today.toISOString();
      } else if (insight.event.date.toLowerCase() === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        eventDateTime = tomorrow.toISOString();
      } else {
        // Try to parse the date string directly
        eventDateTime = new Date(insight.event.date).toISOString();
      }
    } catch (error) {
      // Fallback to current time if parsing fails
      eventDateTime = new Date().toISOString();
    }

    // Use full event data if available (includes attendees), otherwise create from insight data
    const eventData = {
      ...insight.fullEventData,
      // Ensure we have the required fields in case they're missing
      _id: insight.fullEventData._id.split('-')[0],
      status: insight.fullEventData.status,
      visibility: insight.fullEventData.visibility,
      end_time: insight.fullEventData.end_time || new Date(new Date(insight.fullEventData.start_time).getTime() + 2 * 60 * 60 * 1000),
    }

    return (
      <View style={{ marginBottom: 8, width: '100%' }}>
        <PastEvent event={eventData} loading={false} />
      </View>
    );
  }, [insight?.event, insight?.fullEventData]);

  const getWeatherBackground = useCallback((condition: string) => {
    // Try to get specific weather condition data first
    const weatherCondition = getWeatherConditionFromDescription(condition);
    if (weatherCondition) {
      return weatherCondition.gradients[colorScheme === 'dark' ? 'dark' : 'light'];
    }
    
    // Fallback to generic gradient matching
    return getWeatherGradient('CLR', colorScheme === 'dark' ? 'dark' : 'light');
  }, [colorScheme]);

  const getTrafficMapImage = useCallback(() => {
    // Use event location snapshot if available and has coordinates
    if (insight?.event?.coordinates?.lat && insight?.event?.coordinates?.lng) {
      // Use the event's mapSnapshotUrl if available
      if (insight.fullEventData?.location) {
        const snapshotUrl = colorScheme === 'dark' 
          ? insight.fullEventData.location.mapSnapshotUrl.dark 
          : insight.fullEventData.location.mapSnapshotUrl.light;
        
        if (snapshotUrl) {
          return { uri: snapshotUrl };
        }
      }
    }
    
    // Fallback to default CDN images
    const CDN_DOMAIN = 'cdn.kinovo.app';
    const mapPath = 'insight-map';
    
    return colorScheme === 'dark'
      ? { uri: `https://${CDN_DOMAIN}/${mapPath}/map-dark.jpg` }
      : { uri: `https://${CDN_DOMAIN}/${mapPath}/map-light.jpg` };
  }, [colorScheme, insight?.event?.coordinates, insight?.fullEventData?.mapSnapshotUrl]);

  // Log traffic data only once per insight using ref
  React.useEffect(() => {
    const insightKey = insight ? `${insight.title}-${insight.subtitle}` : null;
    
    if (insight?.traffic && currentInsightRef.current === insightKey && !loggedTrafficRef.current) {
      loggedTrafficRef.current = true;
    } else if (!insight?.traffic || currentInsightRef.current !== insightKey) {
      loggedTrafficRef.current = false; // Reset for next insight
    }
  }, [insight?.traffic, insight?.title, insight?.subtitle]);

  const renderSubCards = useMemo(() => {
    if (!insight?.weather && !insight?.traffic) return null;

    return (
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between',
        gap: 8 
      }}>
        {insight.weather && (
          <View style={{
            flex: 1,
            borderRadius: 16,
            padding: 16,
            overflow: 'hidden',
          }}>
            <LinearGradient
              colors={getWeatherBackground(insight.weather.condition)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 16,
              }}
            />
            <View style={{ flex: 1, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 26 }}>
                  {insight.weather.emoji || getWeatherEmoji(insight.weather.condition) || '🌤️'}
                </Text>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: '700', 
                  color: '#ffffff',
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}>
                  {insight.weather.temperature}
                </Text>
              </View>
              <View>
                <Text style={{ 
                  fontSize: 13, 
                  color: '#ffffff',
                  fontWeight: '600',
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}>
                  {insight.weather.condition}
                </Text>
                <Text style={{ 
                  fontSize: 11, 
                  color: 'rgba(255,255,255,0.9)',
                  marginTop: 2,
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}>
                  {insight.weather.recommendation}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {insight.traffic && (
          <View style={{
            flex: 1,
            borderRadius: 16,
            padding: 16,
            overflow: 'hidden',
          }}>
            <ImageBackground
              source={getTrafficMapImage()}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 16,
              }}
              contentFit="cover"
              cachePolicy="disk"
              allowDownscaling={true}
              imageStyle={{
                borderRadius: 16,
              }}
            />
            {/* Semi-transparent overlay for better text readability */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 16,
            }} />
            
            <View style={{ flex: 1, justifyContent: 'space-between', zIndex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 26 }}>{insight.traffic.emoji}</Text>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: '700', 
                  color: '#ffffff',
                  textShadowColor: 'rgba(0,0,0,0.8)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}>
                  {insight.traffic.duration}
                </Text>
              </View>
              <View>
                <Text style={{ 
                  fontSize: 13, 
                  color: '#ffffff',
                  fontWeight: '600',
                  textShadowColor: 'rgba(0,0,0,0.8)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}>
                  {insight.traffic.condition}
                </Text>
                <Text style={{ 
                  fontSize: 11, 
                  color: 'rgba(255,255,255,0.9)',
                  marginTop: 2,
                  textShadowColor: 'rgba(0,0,0,0.8)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}>
                  {insight.traffic.recommendation}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }, [insight?.weather, insight?.traffic, getWeatherBackground, getTrafficMapImage]);

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
          onPress={() => router.push('/(auth)/(aiAssistant)/AiAssistant')}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {colorScheme === 'dark' ? (
            <Image 
              source={require('@/assets/aiAssistantWhite.gif')}
              style={{ width: 18, height: 18, marginRight: 6, marginTop: 0 }}
            /> ) : (
            <Image 
              source={require('@/assets/aiAssistant.gif')}
              style={{ width: 18, height: 18, marginRight: 10 }}
            /> )
          }
          <ThemedText style={{ fontSize: 16, marginRight: 4 }}>Assistant</ThemedText>
          <IconSymbol
            name="chevron.right"
            size={12}
            color={Colors[colorScheme ?? 'dark'].tint}
          />
        </TouchableOpacity>
      </ThemedView>
      
      {/* AI Insights Text Card */}
      <View style={{ flex: 1, backgroundColor: themeColors.eventCardBackgroundColor, padding: 16, borderRadius: 16 }}>
      <TouchableOpacity
        onPress={insight?.cta ? handleCTAPress : undefined}
        style={{
          width: '100%',
          borderRadius: 12,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
        disabled={!insight?.cta}
        activeOpacity={insight?.cta ? 0.7 : 1}
      > 
        {isLoading ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {colorScheme === 'dark' ? (
                <Image 
                  source={require('@/assets/aiAssistantWhite.gif')}
                  style={{ width: 24, height: 24, marginRight: 10, marginTop: -10 }}
                /> ) : (
                <Image 
                  source={require('@/assets/aiAssistant.gif')}
                  style={{ width: 24, height: 24, marginRight: 10 }}
                /> )
              }
              <LoadingTypingText 
                progress={loadingProgress}
                style={{ fontSize: 16, color: themeColors.text, marginBottom: 10 }}
              />
            </View>
            <Reanimated.View
              style={{
                width: '100%',
                height: 16,
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: themeColors.inputBackgroundColor,
              }}
            >
              <Reanimated.View
                style={loadingShimmerStyle}
              >
                <LinearGradient
                  colors={[themeColors.inputBackgroundColor, themeColors.mountainGreen, themeColors.inputBackgroundColor]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ width: '100%', height: '100%' }}
                />
              </Reanimated.View>
            </Reanimated.View>
          </>
        ) : insight ? (
          <>
            {/* Header with emoji, title, and subtitle */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* <Text style={{ fontSize: 22, marginRight: 10 }}>{insight.emoji}</Text> */}
              <AnimatedTypingText
                text={insight.title}
                progress={titleProgress}
                showCursor={showTitleCursor}
                cursorOpacity={cursorOpacity}
                style={{ 
                  flexShrink: 1, 
                  flexWrap: 'wrap', 
                  fontSize: 16, 
                  color: themeColors.text, 
                  fontWeight: 'bold',
                  marginBottom: 8
                }}
                cursorStyle={{
                  color: themeColors.text,
                  fontSize: 18,
                  fontWeight: 'bold'
                }}
              />
            </View>
            <AnimatedTypingText
              text={insight.subtitle}
              progress={subtitleProgress}
              showCursor={showSubtitleCursor}
              cursorOpacity={cursorOpacity}
              style={{ 
                flexShrink: 1, 
                flexWrap: 'wrap', 
                fontSize: 14, 
                color: themeColors.text,
              }}
              cursorStyle={{
                color: themeColors.text,
                fontSize: 16
              }}
            />

            {/* CTA button */}
            {showContent && insight.cta && (
              <Reanimated.View 
                style={[
                  {
                    backgroundColor: themeColors.mountainGreen,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    alignSelf: 'flex-start',
                  },
                  ctaButtonStyle
                ]}
              >
                <Text style={{ 
                  color: themeColors.text, 
                  fontWeight: '600',
                  fontSize: 14
                }}>
                  {insight.cta.text}
                </Text>
              </Reanimated.View>
            )}
          </>
        ) : null}
      </TouchableOpacity>

      {/* Event Card (separate from AI text) */}
      {showContent && insight?.type === 'event' && insight?.event && (
        <Reanimated.View 
          style={eventCardStyle}
        >
          {renderEventCard()}
        </Reanimated.View>
      )}

      {/* Weather and Traffic Cards (separate from AI text) */}
      {showContent && insight?.type === 'event' && (insight?.weather || insight?.traffic) && (
        <Reanimated.View 
          style={subCardsStyle}
        >
          {renderSubCards}
        </Reanimated.View>
      )}
      </View>
    </ThemedView>
  );
});

AISummary.displayName = 'AISummary';

export default AISummary;