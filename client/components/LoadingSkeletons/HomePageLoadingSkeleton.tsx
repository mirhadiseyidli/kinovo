import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, useWindowDimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const SkeletonBox = ({ width, height, borderRadius = 4 }: { width: number | string; height: number | string; borderRadius?: number }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const resolvedWidth = typeof width === 'string'
    ? (parseFloat(width) / 100) * windowWidth
    : width;
  const resolvedHeight = typeof height === 'string'
    ? (parseFloat(height) / 100) * windowHeight
    : height;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-resolvedWidth, resolvedWidth],
  });

  return (
    <View 
      style={{ 
        width: resolvedWidth,
        height: resolvedHeight,
        backgroundColor: themeColors.skeletonBoxColor,
        borderRadius,
        overflow: 'hidden' 
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: [{ translateX: shimmerTranslate }],
          backgroundColor: themeColors.skeletonLoadingColor,
        }}
      />
    </View>
  );
};

const HomePageLoadingSkeleton = () => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <View style={{ flex: 1, width: '100%', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Header Skeleton */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 64, marginBottom: 16 }}>
        <SkeletonBox width={100} height={32} borderRadius={6} />
        <SkeletonBox width={32} height={32} borderRadius={16} />
      </View>

      {/* Upcoming Events */}
      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <SkeletonBox width={120} height={20} borderRadius={4} />
          <SkeletonBox width={80} height={20} borderRadius={4} />
        </View>
        {[...Array(3)].map((_, index) => (
          <View key={index} style={{ flexDirection: 'row', marginBottom: 20 }}>
            <SkeletonBox width={width / 4} height={width / 4} borderRadius={8} />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <SkeletonBox width="100%" height={12} borderRadius={4} />
              <View style={{ marginTop: 6 }}>
                <SkeletonBox width="60%" height={12} borderRadius={4} />
              </View>
              <View style={{ marginTop: 6 }}>
                <SkeletonBox width="80%" height={12} borderRadius={4} />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Friends' Events */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 }}>
          <SkeletonBox width={140} height={20} borderRadius={4} />
          <SkeletonBox width={60} height={16} borderRadius={4} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[...Array(6)].map((_, index) => (
              <View key={index} style={{ alignItems: 'center' }}>
                <SkeletonBox width={width * 0.18} height={width * 0.18} borderRadius={width * 0.09} />
                <View style={{ marginTop: 4 }}>
                  <SkeletonBox width={width * 0.18} height={10} borderRadius={4} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Past Events */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <SkeletonBox width={120} height={20} borderRadius={4} />
          <SkeletonBox width={60} height={20} borderRadius={4} />
        </View>
        {[...Array(2)].map((_, index) => (
          <View key={index} style={{ marginBottom: 16 }}>
            <SkeletonBox width="100%" height={width / 1.9} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );
};

export default HomePageLoadingSkeleton;