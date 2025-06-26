import React from 'react';
import { View, Dimensions } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface StaticGridProps {
  cellWidth: number;
  cellHeight: number;
}

const StaticGrid: React.FC<StaticGridProps> = React.memo(({ cellWidth, cellHeight }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // Create a 6x7 grid (6 weeks, 7 days per week)
  const rows = Array(6).fill(null);
  const cols = Array(7).fill(null);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {rows.map((_, rowIndex) => (
        <View key={`row-${rowIndex}`} style={{ flexDirection: 'row' }}>
          {cols.map((_, colIndex) => (
            <View
              key={`cell-${rowIndex}-${colIndex}`}
              style={{
                width: cellWidth,
                height: cellHeight,
                borderWidth: colorScheme === 'dark' ? 0.2 : 0.25,
                borderColor: themeColors.calendarBorderColor,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

export default StaticGrid; 