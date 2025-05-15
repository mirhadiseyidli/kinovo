import React, { useEffect, useState } from 'react';
import { Pressable, TextStyle, View, ViewStyle, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';

type TintColors = {
  true: string;
  false: string;
};

type Props = {
  value: boolean;
  onValueChange: (val: boolean) => void;
  onCheckColor?: string;
  tintColors?: TintColors;
  style?: ViewStyle;
  textStyle?: TextStyle;
  topContainerStyle?: ViewStyle;
  label?: string;
};

const AnimatedCheckBox = ({
  value,
  onValueChange,
  onCheckColor = '#fff', // Default checkmark color
  tintColors = { true: '#fff', false: '#fff' }, // Default border colors
  style = {},
  textStyle={},
  topContainerStyle,
  label
}: Props) => {
  // Shared progress: 0 for unchecked, 1 for checked
  const progress = useSharedValue(value ? 1 : 0);
  const [containerHeight, setContainerHeight] = useState(0);
  const AnimatedThemedText = Animated.createAnimatedComponent(Text);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 300 });
  }, [value]);

  // Animated style for the container border color
  const checkBoxAnimationStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [tintColors.false, tintColors.true]
    ),
  }));

  // Animated style for checkmark: fade in and scale in when checked
  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [tintColors.false, tintColors.true] // from inactive to active text color
    )
  }));

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
      <Pressable onPress={() => onValueChange(!value)} style={style}>
        <Animated.View
          onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
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
};

export default AnimatedCheckBox;