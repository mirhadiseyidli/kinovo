import React, { memo, useCallback, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";

import Animated, {
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { useRefreshDerivedValue } from "./hooks/use-refresh-value";
import { RefreshTypeEnum, type RefreshControlProps } from "./types";

type RefreshControlContainerProps = {
  top: number;
  refreshHeight: number;
  overflowPull: number;
  opacityValue: SharedValue<number>;
  refreshValue: SharedValue<number>;
  isRefreshing: SharedValue<boolean>;
  isRefreshingWithAnimation: SharedValue<boolean>;
  pullExtendedCoefficient: number;
  renderContent?: (refreshProps: RefreshControlProps) => React.ReactElement;
  refreshControlColor?: string;
};

const RefreshControlContainer = memo<RefreshControlContainerProps>(
  ({
    top,
    refreshHeight,
    overflowPull,
    opacityValue,
    refreshValue,
    isRefreshing,
    isRefreshingWithAnimation,
    pullExtendedCoefficient,
    renderContent,
    refreshControlColor = "#999999",
  }) => {
    const refreshType = useSharedValue<RefreshTypeEnum>(RefreshTypeEnum.Idle);
    const hasTriggeredHaptic = useSharedValue(false);

    const progress = useDerivedValue(() => {
      "worklet";
      return isRefreshingWithAnimation.value 
        ? 1 
        : Math.min(refreshValue.value / refreshHeight, 1);
    }, [refreshHeight, refreshValue, isRefreshingWithAnimation]);

    const tranYValue = useSharedValue(0);

    useRefreshDerivedValue(tranYValue, {
      animatedValue: refreshValue,
      refreshHeight,
      overflowPull,
      pullExtendedCoefficient,
    });

    const triggerHaptic = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    useAnimatedReaction(
      () => {
        "worklet";
        return progress.value;
      },
      (currentProgress, previousProgress) => {
        "worklet";
        if (previousProgress !== null && previousProgress !== undefined) {
          if (currentProgress >= 1 && previousProgress < 1 && !hasTriggeredHaptic.value) {
            hasTriggeredHaptic.value = true;
            runOnJS(triggerHaptic)();
          } else if (currentProgress < 0.9 && hasTriggeredHaptic.value) {
            hasTriggeredHaptic.value = false;
          }
        }
      },
      [progress]
    );

    useAnimatedReaction(
      () => {
        "worklet";
        return {
          progress: progress.value,
          isRefreshing: isRefreshing.value,
          isRefreshingWithAnimation: isRefreshingWithAnimation.value,
        };
      },
      (current, previous) => {
        "worklet";
        if (!previous) return;
        
        if (current.isRefreshing !== current.isRefreshingWithAnimation) {
          refreshType.value = current.isRefreshing
            ? RefreshTypeEnum.Pending
            : RefreshTypeEnum.Finish;
          return;
        }
        
        if (current.isRefreshing) {
          refreshType.value = RefreshTypeEnum.Refreshing;
        } else {
          refreshType.value =
            current.progress < 1 ? RefreshTypeEnum.Cancel : RefreshTypeEnum.Success;
        }
      },
      [refreshHeight]
    );

    const animatedStyle = useAnimatedStyle(() => {
      "worklet";
      return {
        opacity: 1,
        transform: [
          {
            translateY: 0,
          },
        ],
      };
    }, []);

    const childProps = useMemo(
      () => ({
        refreshValue,
        refreshType,
        progress,
      }),
      [refreshValue, refreshType, progress]
    );

    const _renderContent = useCallback(() => {
      if (renderContent) {
        return React.cloneElement(renderContent(childProps), childProps);
      }
      return (
        <RefreshControlNormal
          {...childProps}
          refreshControlColor={refreshControlColor}
        />
      );
    }, [renderContent, childProps, refreshControlColor]);

    const containerStyle = useMemo(
      () => [
        styles.container,
        { 
          top: top + 20,
          height: refreshHeight,
          zIndex: -1,
        },
        animatedStyle,
      ],
      [top, refreshHeight, animatedStyle]
    );

    return (
      <Animated.View style={containerStyle}>{_renderContent()}</Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  baseControl: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  container: {
    left: 0,
    position: "absolute",
    right: 0,
    width: "100%",
  },
  textStyle: {
    marginTop: 4,
    fontSize: 13,
    textAlign: "center",
  },
  circularContainer: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
});

const CircularProgressBar = memo<{
  progress: SharedValue<number>;
  refreshType: SharedValue<RefreshTypeEnum>;
  color: string;
}>(function CircularProgressBar({ progress, refreshType, color }) {
  const rotationValue = useSharedValue(0);
  const BAR_COUNT = 20;
  const RADIUS = 18;
  const BAR_WIDTH = 2;
  const BAR_HEIGHT = 6;
  
  useAnimatedReaction(
    () => refreshType.value,
    (current, previous) => {
      "worklet";
      if (current === RefreshTypeEnum.Refreshing && previous !== RefreshTypeEnum.Refreshing) {
        rotationValue.value = withTiming(360 * 1000, {
          duration: 800000,
        });
      } else if (current !== RefreshTypeEnum.Refreshing && previous === RefreshTypeEnum.Refreshing) {
        rotationValue.value = 0;
      }
    }
  );

  const containerStyle = useAnimatedStyle(() => {
    "worklet";
    const rotation = refreshType.value === RefreshTypeEnum.Refreshing 
      ? rotationValue.value 
      : 0;
    
    return {
      transform: [
        { rotate: `${rotation}deg` }
      ],
    };
  });

  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, index) => {
      const angle = (index * 360) / BAR_COUNT;
      const radian = (angle * Math.PI) / 180;
      const x = RADIUS * Math.cos(radian);
      const y = RADIUS * Math.sin(radian);
      
      return { index, angle, x, y };
    });
  }, []);

  return (
    <Animated.View style={[styles.circularContainer, containerStyle]}>
      {bars.map(({ index, angle, x, y }) => {
        const barStyle = useAnimatedStyle(() => {
          "worklet";
          const progressPerBar = 1 / BAR_COUNT;
          const barStartProgress = index * progressPerBar;
          const barEndProgress = (index + 1) * progressPerBar;
          
          let opacity = 0;
          if (progress.value >= barEndProgress) {
            opacity = 1;
          } else if (progress.value > barStartProgress) {
            opacity = (progress.value - barStartProgress) / progressPerBar;
          }
          
          const scale = interpolate(
            opacity,
            [0, 1],
            [0.8, 1]
          );
          
          return {
            opacity: withTiming(opacity, { duration: 100 }),
            backgroundColor: color,
            position: 'absolute',
            width: BAR_WIDTH,
            height: BAR_HEIGHT,
            borderRadius: BAR_WIDTH / 2,
            transform: [
              { translateX: x },
              { translateY: y },
              { rotate: `${angle + 90}deg` },
              { scale },
            ],
          };
        });
        
        return <Animated.View key={index} style={barStyle} />;
      })}
    </Animated.View>
  );
});

const RefreshControlNormal = memo<
  RefreshControlProps & { refreshControlColor?: string }
>(function RefreshControlNormal({ refreshControlColor, progress, refreshType }) {
  return (
    <Animated.View style={styles.baseControl}>
      <CircularProgressBar 
        progress={progress}
        refreshType={refreshType}
        color={refreshControlColor || '#FFFFFF'}
      />
    </Animated.View>
  );
});

export default RefreshControlContainer;
