import React from 'react';
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

const ReanimatedShimmerLine = ({
  height = 3,
  gradientWidth = 120,
  colors = ['green', 'yellow', 'red'],
  speed = 1000, // lower is faster
  backgroundColor = 'transparent',
  loading = true,
}) => {
  const translateX = useSharedValue(-gradientWidth);
  const loadingDerived = useDerivedValue(() => {
    return loading ? 1 : 0;
  }, [loading]);

  useAnimatedReaction(
    () => loadingDerived.value,
    (current, previous) => {
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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
};

export default ReanimatedShimmerLine;