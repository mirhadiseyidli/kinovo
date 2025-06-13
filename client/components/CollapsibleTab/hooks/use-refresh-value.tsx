import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";

/**
 * Hook for deriving animation values for pull-to-refresh
 * @param translateYValue Shared value to update with the interpolated translation
 * @param params Configuration parameters for the interpolation
 * @returns An animated style that can be used directly
 */
export const useRefreshDerivedValue = (
  translateYValue: Animated.SharedValue<number>,
  {
    refreshHeight,
    overflowPull,
    animatedValue,
    pullExtendedCoefficient,
  }: {
    refreshHeight: number;
    overflowPull: number;
    animatedValue: Animated.SharedValue<number>;
    pullExtendedCoefficient: number;
  }
) => {
  // Instead of directly mutating translateYValue.value, we return a derived value
  return useDerivedValue(() => {
    "worklet";
    // Calculate the interpolated value
    const interpolatedValue = interpolate(
      animatedValue.value,
      [0, refreshHeight + overflowPull, refreshHeight + overflowPull + 1],
      [
        0,
        refreshHeight + overflowPull,
        refreshHeight + overflowPull + pullExtendedCoefficient,
      ]
    );
    
    // Update the translate value
    translateYValue.value = interpolatedValue;
    
    // Return the value (can be used if needed)
    return interpolatedValue;
  }, [refreshHeight, overflowPull, pullExtendedCoefficient, animatedValue]);
};
