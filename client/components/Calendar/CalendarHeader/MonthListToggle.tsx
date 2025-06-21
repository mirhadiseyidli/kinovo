import React, { memo, useEffect, useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import Animated, { AnimatedStyle, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { MonthListToggleProps } from '@/types/allTypes';

const MonthListToggle: React.FC<MonthListToggleProps> = memo(({ title, year, monthListOpen, setMonthListOpen }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const rotateAnim = useSharedValue(0);

  // 🔧 Sync animation with external state changes
  useEffect(() => {
    rotateAnim.value = withTiming(monthListOpen ? 1 : 0, { duration: 250 });
  }, [monthListOpen]);

  // Memoize animated style to prevent recreation
  const animatedRotateStyle = useAnimatedStyle(() => {
    const rotation = interpolate(rotateAnim.value, [0, 1], [0, 90]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  }, [rotateAnim]);

  const toggleMonthList = useCallback(() => {
    setMonthListOpen(!monthListOpen); // animation now handled in useEffect
  }, [monthListOpen, setMonthListOpen]);

  return (
    <TouchableOpacity onPress={toggleMonthList}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ThemedText style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 18 }}>
          {`${title} ${year}`}
        </ThemedText>
        <Animated.View style={[animatedRotateStyle, { marginLeft: 4, marginTop: 2 }]}>
          <MaterialIcons
            name="chevron-right"
            size={18}
            color={themeColors.text}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
});

export default MonthListToggle;