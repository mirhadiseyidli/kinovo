/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from "react";
import type { ComponentClass } from "react";
import type { ScrollViewProps } from "react-native";

import type { NativeGesture } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import type {
  TabViewProps,
  Route as TabViewRoute,
} from "react-native-tab-view";

export type Route = TabViewRoute & {
  key?: string;
  index: number;
  subtitle?: string | number;
};

export enum RefreshTypeEnum {
  Idle = 0,
  Pending = 1,
  Success = 2,
  Refreshing = 3,
  Finish = 4,
  Cancel = 5,
}

export type CollapsibleHeaderProps<T extends Route> = {
  initHeaderHeight?: number;
  renderScrollHeader?: () => React.ReactElement | null;
  overridenShareAnimatedValue?: SharedValue<number>;
  overridenTranslateYValue?: SharedValue<number>;
  initTabbarHeight?: number;
  minHeaderHeight?: number;
  overflowHeight?: number;
  headerRespond?: boolean;
  scrollEnabled?: boolean;
  isRefreshing?: boolean;
  onStartRefresh?: () => void;
  renderRefreshControl?: (
    refreshProps: RefreshControlProps
  ) => React.ReactElement;
  refreshHeight?: number;
  overflowPull?: number;
  pullExtendedCoefficient?: number;
  animationHeaderPosition?: SharedValue<number>;
  animationHeaderHeight?: SharedValue<number>;
  panHeaderMaxOffset?: number;
  onPullEnough?: () => void;
  refreshControlColor?: string;
  refreshControlTop?: number;
  emptyBodyComponent?: React.ReactElement | null;
  renderSceneHeader?: (props: T) => React.ReactElement | null;
  /**
   * Enabling this option will prevent Reanimated & GestureHandler from crashing sometimes in debug mode.
   */
  enableGestureRunOnJS?: boolean;
};

export type TabViewCustomRenders = {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  renderTabBarContainer: (children: any) => React.ReactElement;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  renderSceneHeader: (children: any, props: any) => React.ReactElement;
};

export type GestureContainerProps<T extends Route> = Pick<
  TabViewProps<Route>,
  "navigationState"
> &
  CollapsibleHeaderProps<T> & {
    initialPage: number;
    renderTabView: (e: TabViewCustomRenders) => React.ReactElement;
  };

export interface RefreshControlProps {
  refreshValue: SharedValue<number>;
  refreshType: SharedValue<RefreshTypeEnum>;
  progress: SharedValue<number>;
  refreshControlColor?: string;
}
export type SceneProps<P extends object> = P & {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  ContainerView: any;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  forwardedRef: any;
  index: number;
  useExternalScrollView?: boolean;
} & ScrollViewProps;

export type UpdateSceneInfoParams = {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  scrollRef: any;
  index: number;
  scrollY: SharedValue<number>;
};

export type ScrollableView<T> = ComponentClass<T>;

export type ForwardRefType<T> =
  | ((instance: T | null) => void)
  | React.MutableRefObject<T | null>
  | null;

export type GesturePanContext = {
  startY: SharedValue<number>;
  basyY: SharedValue<number>;
};
export type TabHeaderContext = {
  isSlidingHeader: SharedValue<boolean>;
  shareAnimatedValue: SharedValue<number>;
  isStartRefreshing: SharedValue<boolean>;
  minHeaderHeight: number;
  tabbarHeight: number;
  headerHeight: number;
  scrollStickyHeaderHeight: number;
  refreshHeight: number;
  overflowPull: number;
  pullExtendedCoefficient: number;
  headerTrans: SharedValue<number>;
  expectHeight: number;
  refHasChanged: (ref: NativeGesture) => void;
  curIndexValue: SharedValue<number>;
  updateSceneInfo: (e: UpdateSceneInfoParams) => void;
  scrollViewPaddingTop: number;
} | null;
