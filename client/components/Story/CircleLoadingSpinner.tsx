import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  useAnimatedStyle,
  Easing 
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface CircleLoadingSpinnerProps {
  size: number;
  strokeWidth?: number;
  isVisible: boolean;
}

const CircleLoadingSpinner: React.FC<CircleLoadingSpinnerProps> = ({
  size,
  strokeWidth = 3,
  isVisible
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [isVisible, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  if (!isVisible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderTopColor: themeColors.mountainGreen,
            borderRightColor: themeColors.mountainGreen,
            borderBottomColor: 'rgba(0,0,0,0.3)',
            borderLeftColor: 'rgba(0,0,0,0.3)',
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

export default CircleLoadingSpinner; 