import React, { memo, useCallback, useMemo } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";

import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
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
        opacity: withSpring(opacityValue.value, {
          mass: 1,
          damping: 15,
          stiffness: 120,
        }),
        transform: [
          {
            translateY: tranYValue.value,
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
        { top: top - refreshHeight, height: refreshHeight },
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
    paddingTop: 10,
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
});

const RefreshControlNormal = memo<
  RefreshControlProps & { refreshControlColor?: string }
>(function RefreshControlNormal({ refreshControlColor }) {
  return (
    <Animated.View style={styles.baseControl}>
      <ActivityIndicator color={refreshControlColor} />
    </Animated.View>
  );
});

export default RefreshControlContainer;
