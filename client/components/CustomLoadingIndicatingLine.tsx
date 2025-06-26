import React, { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

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
  colors = [Colors[useColorScheme() ?? 'dark'].background, Colors[useColorScheme() ?? 'dark'].mountainGreen, Colors[useColorScheme() ?? 'dark'].background],
  speed = 1000, // lower is faster
  backgroundColor = 'transparent',
  loading = true,
}) => {
  const translateX = useSharedValue(-gradientWidth);
  const isAnimating = useSharedValue(false);

  // Start animation function that runs on the UI thread
  const startAnimation = () => {
    'worklet';
    if (!isAnimating.value) {
      isAnimating.value = true;
      translateX.value = withRepeat(
        withTiming(SCREEN_WIDTH, { duration: speed }),
        -1,
        false
      );
    }
  };

  // Stop animation function that runs on the UI thread
  const stopAnimation = () => {
    'worklet';
    if (isAnimating.value) {
      isAnimating.value = false;
      cancelAnimation(translateX);
      translateX.value = -gradientWidth;
    }
  };

  // Handle loading state changes
  useEffect(() => {
    if (loading) {
      startAnimation();
    } else {
      stopAnimation();
    }

    // Cleanup on unmount
    return () => {
      stopAnimation();
    };
  }, [loading]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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