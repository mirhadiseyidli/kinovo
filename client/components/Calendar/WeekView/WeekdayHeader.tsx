// components/Calendar/WeekdayHeader.tsx
import React from 'react';
import { FlatList, View, Text, Dimensions, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { ThemedView } from '@/components/ThemedView';

interface WeekdayHeaderProps {
  weekDates: Date[];
  themeColors: any;
}

const WeekdayHeader: React.FC<WeekdayHeaderProps> = ({ weekDates, themeColors }) => {
  const screenWidth = Dimensions.get('window').width;
  
  return (
    <View style={{ width: '100%', paddingTop: 8 }} >
      <FlatList
        data={weekDates}
        horizontal
        scrollEnabled={false}
        style={{
          flexDirection: 'row',
        }}
        keyExtractor={(date) => date.toISOString()}
        renderItem={({ item: date }) => (
          <TouchableOpacity style={{ width: (screenWidth - 50) / weekDates.length, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.background, gap: 4 }}>
            <Text style={{ color: themeColors.text, fontWeight: '600' }}>{format(date, 'EEEEE')}</Text>
            <Text style={{ color: themeColors.text, fontWeight: '600' }}>{format(date, 'd')}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default React.memo(WeekdayHeader);