import React, { useEffect, useRef } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  useAnimatedReaction,
  useDerivedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReanimatedShimmerLineProps {
  height?: number;
  gradientWidth?: number;
  colors?: string[];
  speed?: number;
  backgroundColor?: string;
  loading?: boolean;
}

const ReanimatedShimmerLine = React.memo<ReanimatedShimmerLineProps>(({
  height = 3,
  gradientWidth = 120,
  colors = ['green', 'yellow', 'red'],
  speed = 1000, // lower is faster
  backgroundColor = 'transparent',
  loading = true,
}) => {
  const translateX = useSharedValue(-gradientWidth);
  const mountedRef = useRef(true);
  
  const loadingDerived = useDerivedValue(() => {
    return loading ? 1 : 0;
  }, [loading]);

  useAnimatedReaction(
    () => loadingDerived.value,
    (current, previous) => {
      if (!mountedRef.current) return; // Don't animate if unmounted
      
      if (current === 1 && previous !== 1) {
        translateX.value = withRepeat(
          withTiming(SCREEN_WIDTH, { duration: speed }),
          -1,
          false
        );
      } else if (current === 0 && previous !== 0) {
        cancelAnimation(translateX);
        translateX.value = -gradientWidth;
      }
    }
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cancelAnimation(translateX);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }), [translateX]);

  // Don't render animation elements when not loading to save memory
  if (!loading) {
    return (
      <View style={{ width: '100%', height, backgroundColor }} />
    );
  }

  return (
    <View style={{ width: '100%', height, overflow: 'hidden', backgroundColor }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: gradientWidth,
            height: '100%',
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
});

export default ReanimatedShimmerLine;