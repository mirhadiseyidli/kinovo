// components/Calendar/HourList.tsx
import React from 'react';
import { FlatList, View, Text, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { format } from 'date-fns';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface HourListProps {
  hours: number[];
  scrollRef: React.RefObject<FlatList<any> | null>;
}

const HourList: React.FC<HourListProps> = ({ hours, scrollRef }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ width: 50, alignItems: 'center', paddingTop: 18 }}>
      <FlatList
        ref={scrollRef}
        data={hours}
        keyExtractor={(hour) => hour.toString()}
        scrollEnabled={false}
        contentContainerStyle={{ flexGrow: 0 }}
        renderItem={({ item, index }) => {
          if (index === hours.length - 1) return null;
          return (
            <View style={{ height: 35, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 5 }}>
              {index < 24 && (
                <Text style={{ color: themeColors.text, fontSize: 12 }}>
                  {format(new Date().setHours(item), 'ha')}
                </Text>
              )}            
            </View>
          );
        }}
      />
    </View>
  );
};

export default React.memo(HourList);