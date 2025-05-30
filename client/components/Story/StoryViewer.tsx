import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Animated,
  Easing,
  Dimensions,
  Modal,
  StatusBar,
  Platform,
  TouchableWithoutFeedback,
  Text,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Event as EventType } from '@/types/allTypes';
import { getColors } from 'react-native-image-colors';
import type { ImageColorsResult } from 'react-native-image-colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import EventCard from '@/components/Story/EventCard';
import SwipeControls from '@/components/Story/SwipeControls';
import CircleLoadingSpinner from '@/components/Story/CircleLoadingSpinner';
import { setStoryPlaying } from '@/store/eventPlayStorySlice';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  PanGestureHandler,
  State,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import api from '@/utils/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface StartPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StoryViewerProps {
  visible: boolean;
  friendId: string;
  startPosition?: StartPosition;
  onClose: () => void;
  loading?: boolean;
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  visible,
  friendId,
  startPosition,
  onClose,
  loading: externalLoading = false,
}) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const storyEvents = useSelector(
    (state: RootState) => state.eventStories.eventMap[friendId]
  );
  const stories = useMemo(() => storyEvents || [], [storyEvents]);

  const [content, setContent] = useState<{ content: any; type: string; finish: number; event: EventType }[]>([]);
  const [current, setCurrent] = useState(0);
  const [load, setLoad] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const [internalLoading, setInternalLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const progress = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const colors = useImageColors(content[current]?.content?.uri ?? '');
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Refs for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const mountedRef = useRef(true);
  const viewingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reanimated values for gestures and animations
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const backgroundOpacity = useSharedValue(0);

  // Loading state
  const isLoading = externalLoading || internalLoading;

  // Calculate initial position for expand animation
  const initialScale = startPosition ? Math.min(startPosition.width / screenWidth, startPosition.height / screenHeight) : 0.1;
  const initialTranslateX = startPosition ? startPosition.x + startPosition.width / 2 - screenWidth / 2 : 0;
  const initialTranslateY = startPosition ? startPosition.y + startPosition.height / 2 - screenHeight / 2 : 0;

  // Add a ref to track if we've already marked stories as viewed for this session
  const storiesMarkedRef = useRef(false);

  // Add a ref to track if we've set content for current session
  const contentSetRef = useRef(false);

  // Function to mark a single story as viewed
  const markSingleStoryAsViewed = useCallback(async (eventId: string) => {
    if (!friendId || !eventId) {
      return;
    }

    try {
      await api.post('/api/users/user/stories/mark-viewed', {
        friendId,
        eventIds: [eventId] // Only mark this one event
      });
    } catch (error: any) {
      console.error('Error marking single story as viewed:', error.response?.data || error.message);
    }
  }, [friendId, current]);

  // Function to mark stories as viewed (keep for fallback)
  const markStoriesAsViewed = useCallback(async () => {
    if (!friendId || content.length === 0) {
      return;
    }

    try {
      const eventIds = content.map(item => item.event._id).filter(Boolean);
      
      await api.post('/api/users/user/stories/mark-viewed', {
        friendId,
        eventIds
      });
    } catch (error: any) {
      console.error('Error marking stories as viewed:', error.response?.data || error.message);
    }
  }, [friendId, content]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (viewingTimeoutRef.current) {
        clearTimeout(viewingTimeoutRef.current);
      }
      if (bounceAnimationRef.current) {
        bounceAnimationRef.current.stop();
      }
      progress.stopAnimation();
      fadeAnim.stopAnimation();
    };
  }, []);

  useEffect(() => {
    if (stories.length > 0 && visible && mountedRef.current && !contentSetRef.current) {
      const items = stories.map((story) => ({
        content: story.event.event_picture ? { uri: story.event.event_picture } : require('@/assets/event-default.png'),
        type: 'image',
        finish: 0,
        event: story.event,
      }));
      
      setContent(items);
      contentSetRef.current = true;
      storiesMarkedRef.current = false; // Reset for new content
    } else if (!visible && mountedRef.current && contentSetRef.current) {
      // Only clear and reset if we actually had content set
      setContent([]);
      contentSetRef.current = false;
      storiesMarkedRef.current = false; // Reset for next session
    }
  }, [stories, visible, friendId]);

  useEffect(() => {
    if (visible && mountedRef.current) {
      setInternalLoading(true);
      
      // Expand animation from circle
      scale.value = withSpring(1, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 300 });
      backgroundOpacity.value = withTiming(1, { duration: 300 });
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Reduce loading timeout for faster testing
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setInternalLoading(false);
        }
      }, 2000);
    } else if (!visible) {
      // Shrink animation back to circle
      scale.value = withTiming(initialScale, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
      backgroundOpacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
      
      // Clear timeout and reset state
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Clear viewing timeout
      if (viewingTimeoutRef.current) {
        clearTimeout(viewingTimeoutRef.current);
        viewingTimeoutRef.current = null;
      }
      
      // Stop bounce animation
      if (bounceAnimationRef.current) {
        bounceAnimationRef.current.stop();
        bounceAnimationRef.current = null;
      }
      
      // Reset state (content will be cleared by stories effect)
      setInternalLoading(true);
      setCurrent(0);
      setLoad(false);
    }
  }, [visible]);

  useEffect(() => {
    if (content.length > 0 && visible && !isLoading && mountedRef.current) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      progress.setValue(0);
      // Add a small delay before starting to ensure everything is properly loaded
      setTimeout(() => {
        if (mountedRef.current && visible) {
          play();
        }
      }, 500);
    }
  }, [current, visible, isLoading]);

  // Mark current story as viewed when it becomes active
  useEffect(() => {
    // Clear any existing viewing timeout
    if (viewingTimeoutRef.current) {
      clearTimeout(viewingTimeoutRef.current);
    }

    if (content.length > 0 && content[current] && visible && mountedRef.current) {
      const currentEventId = content[current].event._id;
      if (currentEventId) {
        // Mark as viewed after a 1 second delay to ensure user actually sees it
        viewingTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            markSingleStoryAsViewed(currentEventId);
          }
        }, 1000);
      }
    }

    return () => {
      if (viewingTimeoutRef.current) {
        clearTimeout(viewingTimeoutRef.current);
      }
    };
  }, [current, content, visible, markSingleStoryAsViewed]);

  useEffect(() => {
    if (mountedRef.current) {
      bounceAnimationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -8,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.in(Easing.quad),
          }),
        ])
      );
      bounceAnimationRef.current.start();
    }
    
    return () => {
      if (bounceAnimationRef.current) {
        bounceAnimationRef.current.stop();
      }
    };
  }, []);

  const pause = () => {
    if (!mountedRef.current) return;
    try {
      setIsPlaying(false);
      progress.stopAnimation();
    } catch (error) {
      // Silent error handling
    }
  };

  const start = () => {
    if (!mountedRef.current || !visible) return;
    try {
      // Stop any existing animation first
      progress.stopAnimation();
      
      Animated.timing(progress, {
        toValue: 1,
        duration: 7000, // Increased from 5000 to 7000ms for better viewing time
        useNativeDriver: false,
      }).start(({ finished }) => {
        // Only proceed if animation completed naturally and component is still mounted and visible
        if (finished && mountedRef.current && visible) {
          next();
        }
      });
    } catch (error) {
      // Silent error handling
    }
  };

  const play = () => {
    if (mountedRef.current && !isPlaying) {
      setIsPlaying(true);
      start();
    }
  };

  const next = () => {
    if (!mountedRef.current) return;
    
    if (current !== content.length - 1) {
      let data = [...content];
      data[current].finish = 1;
      setContent(data);
      setCurrent(current + 1);
      progress.setValue(0);
      setLoad(false);
      setIsPlaying(false); // Reset playing state for next story
    } else {
      handleClose();
    }
  };

  const previous = () => {
    if (!mountedRef.current) return;
    
    if (current - 1 >= 0) {
      let data = [...content];
      data[current].finish = 0;
      setContent(data);
      setCurrent(current - 1);
      progress.setValue(0);
      setLoad(false);
      setIsPlaying(false); // Reset playing state for previous story
    } else {
      handleClose();
    }
  };

  const handleClose = useCallback(() => {
    if (!mountedRef.current) return;
    
    // Stop all animations first
    try {
      progress.stopAnimation();
      fadeAnim.stopAnimation();
    } catch (error) {
      // Silent error handling
    }
    
    setLoad(false);
    dispatch(setStoryPlaying(false));
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Clear viewing timeout
    if (viewingTimeoutRef.current) {
      clearTimeout(viewingTimeoutRef.current);
      viewingTimeoutRef.current = null;
    }
    
    // Stop bounce animation
    if (bounceAnimationRef.current) {
      bounceAnimationRef.current.stop();
      bounceAnimationRef.current = null;
    }
    
    onClose();
  }, [onClose, dispatch, progress, fadeAnim]);

  // Helper functions for gesture handler
  const pauseGesture = useCallback(() => {
    if (mountedRef.current) {
      pause();
    }
  }, []);

  const playGesture = useCallback(() => {
    if (mountedRef.current) {
      play();
    }
  }, []);

  const closeWithDelay = useCallback(() => {
    setTimeout(() => {
      if (mountedRef.current) {
        handleClose();
      }
    }, 300);
  }, [handleClose]);

  // Function to handle event navigation
  const handleViewEventDetails = useCallback(() => {
    if (content[current]?.event?._id) {
      const eventId = content[current].event._id;
      // Close the story first
      handleClose();
      // Navigate to event details with a small delay
      setTimeout(() => {
        router.push(`/(auth)/(viewEvent)/${eventId}`);
      }, 300);
    }
  }, [content, current, handleClose, router]);

  // Pan gesture handler for swipe down
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: { startY: number }) => {
      'worklet';
      context.startY = translateY.value;
      runOnJS(pauseGesture)();
    },
    onActive: (event, context: { startY: number }) => {
      'worklet';
      translateY.value = Math.max(0, context.startY + event.translationY);
      
      // Calculate opacity based on swipe distance
      const swipeProgress = translateY.value / (screenHeight * 0.25);
      backgroundOpacity.value = Math.max(0.3, 1 - swipeProgress);
    },
    onEnd: (event) => {
      'worklet';
      const swipeThreshold = screenHeight * 0.25; // 25% of screen height
      
      if (translateY.value > swipeThreshold || event.velocityY > 800) {
        // Close the story viewer
        translateY.value = withTiming(screenHeight, { duration: 300 });
        backgroundOpacity.value = withTiming(0, { duration: 300 });
        scale.value = withTiming(initialScale, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        
        runOnJS(closeWithDelay)();
      } else {
        // Bounce back
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        backgroundOpacity.value = withTiming(1, { duration: 200 });
        runOnJS(playGesture)();
      }
    },
  });

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
        { translateX: interpolate(scale.value, [0, 1], [initialTranslateX, 0], Extrapolate.CLAMP) },
      ],
      opacity: opacity.value,
    };
  });

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backgroundOpacity.value,
    };
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Background overlay */}
        <ReanimatedAnimated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'black',
            },
            backgroundAnimatedStyle,
          ]}
        />

        {/* Loading spinner overlay */}
        {(internalLoading || externalLoading) && content.length === 0 && startPosition && (
          <View
            style={{
              position: 'absolute',
              top: startPosition.y,
              left: startPosition.x,
              width: startPosition.width,
              height: startPosition.height,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <CircleLoadingSpinner
              size={startPosition.width}
              strokeWidth={3}
              isVisible={true}
            />
          </View>
        )}

        <PanGestureHandler onGestureEvent={gestureHandler} enabled={content.length > 0}>
          <ReanimatedAnimated.View style={[{ flex: 1 }, containerAnimatedStyle]}>
            {content.length > 0 && (
              <LinearGradient
                colors={
                  colors?.platform === 'ios'
                    ? [colors.primary, colors.secondary]
                    : [themeColors.mountainGreen, themeColors.background]
                }
                style={{ flex: 1, width: '100%', paddingTop: insets.top }}
              >
                {content[current] && (
                  <View style={{ flex: 1 }}>
                    <EventCard
                      content={content}
                      current={current}
                      fadeAnim={fadeAnim}
                      progress={progress}
                      play={play}
                      close={handleClose}
                      colors={colors}
                    />
                  </View>
                )}
              </LinearGradient>
            )}

            {content.length === 0 && !internalLoading && (
              <View style={{ 
                flex: 1, 
                justifyContent: 'center', 
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.8)',
                paddingTop: insets.top
              }}>
                <ThemedText style={{ color: 'white', fontSize: 18, textAlign: 'center' }}>
                  No stories available{'\n'}
                  Friend ID: {friendId}{'\n'}
                  Stories count: {stories.length}
                </ThemedText>
                <TouchableOpacity 
                  onPress={handleClose}
                  style={{ 
                    marginTop: 20, 
                    backgroundColor: themeColors.mountainGreen, 
                    paddingHorizontal: 20, 
                    paddingVertical: 10, 
                    borderRadius: 8 
                  }}
                >
                  <ThemedText style={{ color: 'white' }}>Close</ThemedText>
                </TouchableOpacity>
              </View>
            )}

            {content.length > 0 && (
              <>
                <SwipeControls
                  pause={pause}
                  play={play}
                  previous={previous}
                  next={next}
                  isLongPress={isLongPress}
                  setIsLongPress={setIsLongPress}
                />
                
                {/* Event details overlay */}
                <TouchableWithoutFeedback onPress={handleViewEventDetails}>
                  <View
                    style={{
                      paddingVertical: 24,
                      position: 'absolute',
                      bottom: 24,
                      left: 0,
                      right: 0,
                      alignItems: 'center',
                      zIndex: 200,
                    }}
                  >
                    <Animated.View
                      style={{
                        alignItems: 'center',
                        transform: [{ translateY: bounceAnim }],
                      }}
                    >
                      <Ionicons name="information-circle-outline" size={20} color={themeColors.text} />
                    </Animated.View>
                    <ThemedText>Click to view details</ThemedText>
                  </View>
                </TouchableWithoutFeedback>
              </>
            )}
          </ReanimatedAnimated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
};

const useImageColors = (url: string) => {
  const [colors, setColors] = React.useState<ImageColorsResult | null>(null);
  const defaultImage = require('@/assets/event-default.png');

  React.useEffect(() => {
    if (!url) return;
    getColors(defaultImage, {
      fallback: '#228B22',
      cache: true,
      key: url,
    }).then(setColors);
  }, [url]);

  return colors;
};

export default StoryViewer; 