import React from "react";
import type { ScrollViewProps } from "react-native";

import Animated from "react-native-reanimated";
import { SceneComponent } from "@/components/CollapsibleTab";

type TabScrollViewProps = ScrollViewProps & {
  index: number;
};
function TabFlashListScrollViewComponent(props: TabScrollViewProps, ref: any) {
  return (
    <SceneComponent
      {...props}
      useExternalScrollView={false}
      forwardedRef={ref}
      ContainerView={Animated.ScrollView}
    />
  );
}

export const TabFlashListScrollView = React.forwardRef(
  TabFlashListScrollViewComponent
);
