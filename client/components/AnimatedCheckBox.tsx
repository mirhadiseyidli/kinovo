import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Pressable, TextStyle, View, ViewStyle, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';

type TintColors = {
  true: string;
  false: string;
};

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void;
  onCheckColor?: string;
  tintColors?: TintColors;
  style?: ViewStyle;
  textStyle?: TextStyle;
  topContainerStyle?: ViewStyle;
  label?: string;
}

const AnimatedCheckBox = React.memo<Props>(({
  value,
  onValueChange,
  onCheckColor = '#fff', // Default checkmark color
  tintColors = { true: '#fff', false: '#fff' }, // Default border colors
  style = {},
  textStyle={},
  topContainerStyle,
  label
}) => {
  // Shared progress: 0 for unchecked, 1 for checked
  const progress = useSharedValue(value ? 1 : 0);
  const [containerHeight, setContainerHeight] = useState(0);
  const AnimatedThemedText = Animated.createAnimatedComponent(Text);
  const mountedRef = useRef(true);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 300 });
  }, [value]);

  // Cleanup effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelAnimation(progress);
    };
  }, []);

  // Memoized animated styles to prevent recreation
  const checkBoxAnimationStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [tintColors.false, tintColors.true]
    ),
  }), [progress, tintColors.false, tintColors.true]);

  // Animated style for checkmark: fade in and scale in when checked
  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }), [progress]);

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [tintColors.false, tintColors.true] // from inactive to active text color
    )
  }), [progress, tintColors.false, tintColors.true]);

  const handlePress = useCallback(() => {
    onValueChange(!value);
  }, [value, onValueChange]);

  const handleLayout = useCallback((e: any) => {
    if (mountedRef.current) {
      setContainerHeight(e.nativeEvent.layout.height);
    }
  }, []);

  return (
    <View 
      style={[
      { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        alignContent: 'center' 
      }, 
        topContainerStyle 
      ]}
    >
      <Pressable onPress={handlePress} style={style}>
        <Animated.View
          onLayout={handleLayout}
          style={[
            {
              borderRadius: 4,
              borderWidth: 2,
              justifyContent: 'center',
              alignItems: 'center',
              aspectRatio: 1
            },
            checkBoxAnimationStyle,
          ]}
        >
          <Animated.View style={checkmarkAnimatedStyle}>
            <Ionicons name="checkmark" size={containerHeight ? containerHeight - 4 : 14} color={onCheckColor} />
          </Animated.View>
        </Animated.View>
      </Pressable>
      <AnimatedThemedText style={[textStyle, animatedTextStyle]}>
        {label}
      </AnimatedThemedText>
    </View>
  );
});

export default AnimatedCheckBox;