import React, { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { CalendarHeaderMonthViewRefProps, MonthToggleRef } from '@/types/allTypes';

interface CurrentMonthSelectorProps {
  currentKeyRef: React.RefObject<Date>;
  onMonthYearChange?: (month: number, year: number, day: number, fromDropdown: boolean) => void;
  today: Date;
  fromChipRef: React.RefObject<boolean>;
}

const CurrentMonthSelector = forwardRef<CalendarHeaderMonthViewRefProps, CurrentMonthSelectorProps>(({
  currentKeyRef,
  onMonthYearChange,
  // setSelectedKey,
  today,
  fromChipRef
}, ref) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const key = `${today.getFullYear()}-${today.getMonth()}`;
  const [selectedDateKey, setSelectedDateKey] = useState(`${currentKeyRef.current.getFullYear()}-${currentKeyRef.current.getMonth()}`);
  const isSelected = selectedDateKey === key;

  useImperativeHandle(ref, () => ({
    update: (date: Date) => {
      currentKeyRef.current = date
      setSelectedDateKey(`${date.getFullYear()}-${date.getMonth()}`)
    },
  }), [ref]);

  const handlePress = () => {
    onMonthYearChange?.(today.getMonth(), today.getFullYear(), today.getDate(), true);
    fromChipRef.current = true;
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{ marginLeft: 16 }}>
      <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Feather
          name="calendar"
          size={30}
          color={isSelected ? themeColors.mountainGreen : themeColors.placeholderTextColor}
        />
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', bottom: 8 }}>
          <ThemedText
            style={{
              color: isSelected ? themeColors.mountainGreen : themeColors.placeholderTextColor,
              fontWeight: '600',
              fontSize: 12,
            }}
          >
            {today.getDate()}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
});


export default CurrentMonthSelector;