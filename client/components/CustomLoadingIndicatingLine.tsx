import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface LoadingLineProps {
  height?: number;
  backgroundColor?: string;
  loading?: boolean;
}

const ReanimatedShimmerLine = React.memo<LoadingLineProps>(({
  height = 3,
  backgroundColor = 'transparent',
  loading = true,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // Don't render animation elements when not loading to save memory
  if (!loading) {
    return (
      <View style={{ width: '100%', height, backgroundColor }} />
    );
  }

  return (
    <View style={{ width: '100%', height, backgroundColor, overflow: 'hidden' }}>
      <Animated.View 
        style={{ 
          position: 'absolute',
          width: '30%', // Small piece 
          height: '100%',
          backgroundColor: themeColors.mountainGreen,
          animationName: {
            '0%': { 
              opacity: 0,
              transform: [{ translateX: '-100%' }]
            },
            '25%': { 
              opacity: 1,
              transform: [{ translateX: '50%' }]
            },
            '75%': { 
              opacity: 1,
              transform: [{ translateX: '150%' }]
            },
            '100%': { 
              opacity: 0,
              transform: [{ translateX: '300%' }]
            },
          },
          animationDuration: '2s',
          animationIterationCount: 'infinite',
          animationTimingFunction: 'linear',
        }}
      />
    </View>
  );
});

export default ReanimatedShimmerLine;