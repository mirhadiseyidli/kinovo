// components/Calendar/WeekGrid.tsx
import React from 'react';
import { FlatList, View, Dimensions } from 'react-native';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const screenWidth = Dimensions.get('window').width;

interface WeekGridProps {
  hours: number[];
  weekDates: Date[];
  gridRef: React.RefObject<FlatList<any> | null>;
}

const WeekGrid: React.FC<WeekGridProps> = ({ hours, weekDates, gridRef }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <FlatList
      ref={gridRef}
      data={hours}
      scrollEventThrottle={16}
      scrollEnabled={false}
      keyExtractor={(hour) => hour.toString()}
      renderItem={() => (
        <View style={{ flexDirection: 'row', height: 35 }}>
          {weekDates.map((date) => (
            <View
              key={date.toISOString()}
              style={{
                width: (screenWidth - 50) / weekDates.length,
                borderWidth: colorScheme === 'dark' ? 0.2 : 0.25,
                borderColor: themeColors.calendarBorderColor,
              }}
            />
          ))}
        </View>
      )}
    />
  );
};

export default React.memo(WeekGrid);