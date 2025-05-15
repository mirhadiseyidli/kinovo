import { CalendarHeaderMonthViewRefProps, MonthItem } from '@/types/allTypes';
import { Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import React from 'react';

export interface MonthChipProps {
  item: MonthItem;
  onMonthYearChange?: (month: number, year: number, day: number, fromDropdown: boolean) => void;
  CHIP_WIDTH: number;
  isSelected: boolean;
  fromChipRef: React.RefObject<boolean>;
}

const MonthChipComponent: React.FC<MonthChipProps> = ({
  item,
  isSelected,
  onMonthYearChange,
  CHIP_WIDTH,
  fromChipRef
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const isStartOfYear = item.month === 0;

  const selectMonth = () => {
    onMonthYearChange?.(item.month, item.year, 1, true);
    fromChipRef.current = true;
  }

  return (
    <>
      {isStartOfYear && (
        <Text
          style={{
            marginHorizontal: 4,
            paddingVertical: 8,
            color: themeColors.text,
            fontWeight: '700',
            fontSize: 12,
          }}
        >
          {item.year}
        </Text>
      )}
      <TouchableOpacity onPress={selectMonth}>
        <View
          style={{
            width: CHIP_WIDTH - 8,
            marginHorizontal: 4,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor:
              isSelected
                ? themeColors.mountainGreen
                : themeColors.inputBackgroundColor,
            alignItems: 'center',
          }}
        >
          <Text 
            style={{ 
              color: 
                isSelected
                  ? '#fff'
                  : themeColors.text, 
              fontWeight: '600', 
              fontSize: 12 
            }}>
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
    </>
  );
};

export const MonthChip = React.memo(MonthChipComponent, (prev, next) =>
  prev.item.key === next.item.key && prev.isSelected === next.isSelected
);
