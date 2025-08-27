import React from "react";

import { FlashList, FlashListProps, FlashListRef } from "@shopify/flash-list";

import { TabFlashListScrollView } from "./tab-flash-list-scroll-view";

export type TabFlashListProps<T> = Omit<
  FlashListProps<T>,
  "renderScrollComponent"
> & {
  index: number;
};

function TabFlashListComponent<T>(
  props: TabFlashListProps<T>,
  ref: React.Ref<FlashListRef<T>>
) {
  return (
    <FlashList
      {...props}
      renderScrollComponent={TabFlashListScrollView as any}
      ref={ref}
    />
  );
}

export const TabFlashList = React.forwardRef(TabFlashListComponent) as <T>(
  props: TabFlashListProps<T> & {
    ref?: React.Ref<FlashListRef<T>>;
  }
) => React.ReactElement;
