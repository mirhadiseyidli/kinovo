import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ThemedText } from '../ThemedText';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedReaction,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

type ExpandableDescriptionProps = {
  description?: string | null;
};

type ShowMoreButtonProps = {
  onPress: () => void;
  showMore: boolean;
  themeColors: {
    mountainGreen: string;
    [key: string]: string;
  };
};

const useChevronRotation = (expanded: SharedValue<number>) => {
  return useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(expanded.value === 1 ? '90deg' : '0deg', { duration: 300 }),
      },
    ],
  }));
};

const useDescriptionHeight = (expanded: SharedValue<number>, fullHeight: number, collapsedHeight: number) => {
  return useAnimatedStyle(() => {
    const targetHeight = expanded.value === 1 ? fullHeight : collapsedHeight;
    return {
      height: withTiming(targetHeight, { duration: 300 })
    };
  });
};

const ShowMoreButton = React.memo<ShowMoreButtonProps>(({ onPress, showMore, themeColors }) => (
  <TouchableOpacity onPress={onPress} style={{ justifyContent: 'center', marginTop: 4 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <ThemedText style={{ color: themeColors.mountainGreen }}>
        {showMore ? 'Show less' : 'Show more'}
      </ThemedText>
      <Animated.View style={{ marginTop: 2 }}>
        <Feather
          name="chevron-right"
          size={14}
          color={themeColors.mountainGreen}
        />
      </Animated.View>
    </View>
  </TouchableOpacity>
));

const ExpandableDescription = ({ description }: ExpandableDescriptionProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [showMore, setShowMore] = useState(false);
  const [fullHeight, setFullHeight] = useState(0);
  const [collapsedHeight, setCollapsedHeight] = useState(0);
  const expanded = useSharedValue(0); // 0: collapsed, 1: expanded

  useAnimatedReaction(
    () => expanded.value,
    (current, prev) => {
      if (current !== prev) {
        runOnJS(setShowMore)(current === 1);
      }
    },
    []
  );

  const iconAnimatedStyle = useChevronRotation(expanded);
  const descriptionAnimatedStyle = useDescriptionHeight(expanded, fullHeight, collapsedHeight);

  const toggleExpand = useCallback(() => {
    expanded.value = expanded.value === 1 ? 0 : 1;
  }, [expanded]);

  return (
    <View style={{
      paddingTop: 16, 
      borderTopColor: themeColors.calendarBorderColor,
      borderTopWidth: 0.2,
    }}>
      <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Description</ThemedText>
      {description && (
        <>
          <View
            style={{ position: 'absolute', opacity: 0, zIndex: -1 }}
            onLayout={(e) => setFullHeight(e.nativeEvent.layout.height)}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: 'normal' }}>
              {description || 'No description available.'}
            </ThemedText>
          </View>
          <View
            style={{ position: 'absolute', opacity: 0, zIndex: -1 }}
            onLayout={(e) => setCollapsedHeight(e.nativeEvent.layout.height)}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: 'normal' }}>
              {description.length > 300 ? `${description.slice(0, 300)}...` : (description || 'No description available.')}
            </ThemedText>
          </View>
        </>
      )}
      <Animated.View style={[descriptionAnimatedStyle, { overflow: 'hidden' }] }>
        <ThemedText style={{ fontSize: 16 }}>
          {description || 'No description available.'}
        </ThemedText>
      </Animated.View>
      {description && description.length > 300 && (
        <ShowMoreButton 
          onPress={toggleExpand}
          showMore={showMore}
          themeColors={themeColors}
        />
      )}
    </View>
  );
};

export default React.memo(ExpandableDescription);