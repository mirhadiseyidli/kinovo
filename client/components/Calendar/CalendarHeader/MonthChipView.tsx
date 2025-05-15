import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AutoSkeletonView } from 'react-native-auto-skeleton';
import { MonthItem } from '@/types/allTypes';

interface MonthChipViewProps {
  listRef: React.RefObject<FlatList<MonthItem> | null>;
  data: MonthItem[];
  selectedKey: string;
  CHIP_WIDTH: number;
  handleMomentumScrollEnd: (event: any) => void;
  renderItem: ({ item, index }: { item: any; index: number }) => React.ReactElement;
}

const MonthChipView: React.FC<MonthChipViewProps> = ({
  listRef,
  data,
  selectedKey,
  CHIP_WIDTH,
  handleMomentumScrollEnd,
  renderItem,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <FlatList
      ref={listRef}
      horizontal
      data={data}
      keyExtractor={item => item.key}
      initialScrollIndex={data.findIndex(i => i.key === selectedKey) + 1}
      getItemLayout={(_, index) => ({
        length: CHIP_WIDTH,
        offset: CHIP_WIDTH * index,
        index,
      })}
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      extraData={selectedKey}
      renderItem={renderItem}
    />
  );
};

export default MonthChipView;